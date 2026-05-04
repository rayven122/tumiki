import { describe, test, expect, beforeEach, vi } from "vitest";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../../mcp-server-list/mcp.repository");
vi.mock("../../../utils/encryption");
vi.mock("../../../utils/credentials");
vi.mock("../../oauth/oauth.refresh");
// @tumiki/mcp-core-proxy の createMcpClient をモック化（実際のSDK Clientは生成しない）
vi.mock("@tumiki/mcp-core-proxy", async () => {
  const actual = await vi.importActual<typeof import("@tumiki/mcp-core-proxy")>(
    "@tumiki/mcp-core-proxy",
  );
  return {
    ...actual,
    createMcpClient: vi.fn(),
  };
});
// path-resolver は別ユニットでテスト済みのため、本テストでは恒等変換に固定して
// service 側の組み立てロジックのみを検証する
vi.mock("../../../runtime/path-resolver", () => ({
  resolveValue: (value: string) => value,
  resolveArgs: (args: readonly string[]) => [...args],
  buildChildEnv: (_base: NodeJS.ProcessEnv, extra: Record<string, string>) =>
    extra,
}));

// テスト対象のインポート（モックの後に行う）
import * as mcpProxyService from "../mcp-proxy.service";
import { createMcpClient } from "@tumiki/mcp-core-proxy";
import { getDb } from "../../../shared/db";
import * as mcpRepository from "../../mcp-server-list/mcp.repository";
import { decryptToken } from "../../../utils/encryption";
import { decryptCredentials } from "../../../utils/credentials";
import { refreshOAuthTokenIfNeeded } from "../../oauth/oauth.refresh";

describe("mcp-proxy.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    // decryptToken: "encrypted:" プレフィックスを除去して返す
    vi.mocked(decryptToken).mockImplementation(async (v) =>
      v.replace(/^encrypted:/, ""),
    );
    // decryptCredentials: デフォルトでは入力をそのまま返す（平文扱い）
    vi.mocked(decryptCredentials).mockImplementation(async (v) => v);
  });

  describe("getEnabledConfigs", () => {
    // findEnabledConnections の戻り値1要素の型
    type EnabledConnection = Awaited<
      ReturnType<typeof mcpRepository.findEnabledConnections>
    >[number];
    type EnabledServer = EnabledConnection["server"];

    // テストデータのデフォルト値を持つヘルパー。型を満たすため as を使わずに済む。
    const buildServer = (overrides: Partial<EnabledServer>): EnabledServer => ({
      id: 1,
      name: "Srv",
      slug: "srv",
      description: "",
      serverStatus: "STOPPED",
      isEnabled: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    const buildConnection = (
      overrides: Partial<Omit<EnabledConnection, "server">> & {
        server?: Partial<EnabledServer>;
      },
    ): EnabledConnection => {
      const { server: serverOverrides, ...rest } = overrides;
      return {
        id: 1,
        name: "Conn",
        slug: "conn",
        transportType: "STDIO",
        command: "echo",
        args: "[]",
        url: null,
        credentials: "{}",
        authType: "NONE",
        isEnabled: true,
        displayOrder: 0,
        serverId: 1,
        catalogId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tools: [],
        server: buildServer(serverOverrides ?? {}),
        ...rest,
      };
    };

    test("暗号化済みSTDIO接続を復号してMcpServerConfig[]に変換する", async () => {
      // createFromCatalog経由で保存されたのと同じ形式（safe:/fallback:プレフィックス付き）を想定
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "Serena",
          slug: "serena",
          command: "uvx",
          args: '["serena","start-mcp-server"]',
          credentials: 'safe:{"API_KEY":"test-key"}',
          server: { name: "Test Server", slug: "test-server" },
        }),
      ]);
      // decryptCredentialsの振る舞い: "safe:" プレフィックスを除去
      vi.mocked(decryptCredentials).mockImplementation(async (v) =>
        v.replace(/^safe:/, "").replace(/^fallback:/, ""),
      );

      const result = await mcpProxyService.getEnabledConfigs();

      // セパレータは `-`（Anthropic API の tool name 制約で `/` は使えないため）
      expect(result).toStrictEqual([
        {
          name: "test-server-serena",
          transportType: "STDIO",
          command: "uvx",
          args: ["serena", "start-mcp-server"],
          env: { API_KEY: "test-key" },
        },
      ]);
      // decryptCredentialsが暗号化済みcredentialsに対して呼び出されることを確認
      expect(decryptCredentials).toHaveBeenCalledWith(
        'safe:{"API_KEY":"test-key"}',
      );
    });

    test("平文credentials（旧データとの互換性）もそのまま扱える", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "Plain",
          slug: "plain",
          command: "echo",
          credentials: '{"TOKEN":"plain"}',
          server: { slug: "srv" },
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "srv-plain",
          transportType: "STDIO",
          command: "echo",
          args: [],
          env: { TOKEN: "plain" },
        },
      ]);
    });

    test("SSE接続をMcpServerConfigに変換する", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "SSE Server",
          slug: "sse-server",
          transportType: "SSE",
          command: null,
          url: "http://localhost:3000/sse",
          authType: "NONE",
          server: { slug: "test" },
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "test-sse-server",
          transportType: "SSE",
          url: "http://localhost:3000/sse",
          authType: "NONE",
          headers: {},
        },
      ]);
    });

    test("SSE接続（BEARER認証）をMcpServerConfigに変換する", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "SSE Auth Server",
          slug: "sse-auth-server",
          transportType: "SSE",
          command: null,
          url: "http://localhost:3000/sse",
          credentials: '{"token":"sse-secret"}',
          authType: "BEARER",
          server: { slug: "test" },
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "test-sse-auth-server",
          transportType: "SSE",
          url: "http://localhost:3000/sse",
          authType: "BEARER",
          headers: { Authorization: "Bearer sse-secret" },
        },
      ]);
    });

    test("STREAMABLE_HTTP接続をMcpServerConfigに変換する", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "HTTP Server",
          slug: "http-server",
          transportType: "STREAMABLE_HTTP",
          command: null,
          url: "http://localhost:3000/mcp",
          credentials: '{"token":"secret-token"}',
          authType: "BEARER",
          server: { slug: "test" },
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "test-http-server",
          transportType: "STREAMABLE_HTTP",
          url: "http://localhost:3000/mcp",
          authType: "BEARER",
          headers: { Authorization: "Bearer secret-token" },
        },
      ]);
    });

    test("urlがnullのSSE接続はスキップする", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "No URL",
          slug: "no-url",
          transportType: "SSE",
          command: null,
          url: null,
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });

    test("commandがnullのSTDIO接続はスキップする", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "No Command",
          slug: "no-command",
          command: null,
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });

    test("接続が0件の場合は空配列を返す", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });

    test("args が不正JSONの接続はスキップされ、他は正常に返る", async () => {
      // 1件目: args が壊れたJSON / 2件目: 正常
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          id: 1,
          name: "Broken",
          slug: "broken",
          command: "node",
          args: "not-json{",
          server: { name: "Broken Srv", slug: "broken-srv" },
        }),
        buildConnection({
          id: 2,
          name: "Good",
          slug: "good",
          command: "echo",
          credentials: '{"OK":"1"}',
          serverId: 2,
          server: { id: 2, name: "Good Srv", slug: "good-srv" },
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "good-srv-good",
          transportType: "STDIO",
          command: "echo",
          args: [],
          env: { OK: "1" },
        },
      ]);
    });

    test("args が string[] でない接続はZod検証で弾かれスキップされる", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "BadArgs",
          slug: "bad-args",
          command: "node",
          // args が number配列 → connectionArgsSchema (z.array(z.string())) で失敗
          args: "[1, 2, 3]",
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });

    test("credentials が string以外の値を含む場合スキップされる", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "BadEnv",
          slug: "bad-env",
          command: "node",
          // credentials に number型の値 → connectionEnvSchema で失敗
          credentials: '{"PORT":3000}',
        }),
      ]);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });

    test("OAuth接続はBEARER認証としてaccess_tokenをヘッダーに付与する", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "OAuth Server",
          slug: "oauth-server",
          transportType: "STREAMABLE_HTTP",
          command: null,
          url: "https://api.figma.com/mcp",
          credentials:
            '{"access_token":"oauth-token","refresh_token":"rt","expires_at":"9999999999"}',
          authType: "OAUTH",
          server: { slug: "figma" },
        }),
      ]);
      // リフレッシュ不要（期限に余裕あり）
      vi.mocked(refreshOAuthTokenIfNeeded).mockResolvedValue(null);

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "figma-oauth-server",
          transportType: "STREAMABLE_HTTP",
          url: "https://api.figma.com/mcp",
          authType: "BEARER",
          headers: { Authorization: "Bearer oauth-token" },
        },
      ]);
    });

    test("OAuth接続でトークンリフレッシュが実行された場合、新しいトークンが使われる", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "OAuth Expired",
          slug: "oauth-expired",
          transportType: "SSE",
          command: null,
          url: "https://api.figma.com/sse",
          credentials:
            '{"access_token":"expired","refresh_token":"rt","expires_at":"1000"}',
          authType: "OAUTH",
          server: { slug: "figma" },
        }),
      ]);
      // リフレッシュ成功 → 新しいcredentialsを返す
      vi.mocked(refreshOAuthTokenIfNeeded).mockResolvedValue({
        access_token: "refreshed-token",
        refresh_token: "new-rt",
        expires_at: "9999999999",
      });

      const result = await mcpProxyService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "figma-oauth-expired",
          transportType: "SSE",
          url: "https://api.figma.com/sse",
          authType: "BEARER",
          headers: { Authorization: "Bearer refreshed-token" },
        },
      ]);
      expect(refreshOAuthTokenIfNeeded).toHaveBeenCalledWith(
        expect.any(Number),
        "https://api.figma.com/sse",
        expect.objectContaining({ access_token: "expired" }),
      );
    });
  });

  describe("fetchToolsForConnection", () => {
    type ConnectionWithServer = NonNullable<
      Awaited<ReturnType<typeof mcpRepository.findConnectionByIdWithServer>>
    >;

    const buildConnectionWithServer = (
      overrides: Partial<ConnectionWithServer> = {},
    ): ConnectionWithServer => ({
      id: 100,
      name: "Conn",
      slug: "conn",
      transportType: "STDIO",
      command: "echo",
      args: "[]",
      url: null,
      credentials: "{}",
      authType: "NONE",
      isEnabled: true,
      displayOrder: 0,
      serverId: 1,
      catalogId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      server: {
        id: 1,
        name: "Srv",
        slug: "srv",
        description: "",
        serverStatus: "STOPPED",
        isEnabled: true,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...overrides,
    });

    /** SDK Client / Transport の最小モック */
    const createMockClient = (overrides?: {
      tools?: { name: string; description?: string; inputSchema: unknown }[];
      connectError?: Error;
      listError?: Error;
    }) => {
      const close = vi.fn().mockResolvedValue(undefined);
      const connect = overrides?.connectError
        ? vi.fn().mockRejectedValue(overrides.connectError)
        : vi.fn().mockResolvedValue(undefined);
      const listTools = overrides?.listError
        ? vi.fn().mockRejectedValue(overrides.listError)
        : vi.fn().mockResolvedValue({ tools: overrides?.tools ?? [] });
      const transport = {} as never;
      return {
        client: {
          connect,
          listTools,
          close,
        } as unknown as Awaited<
          ReturnType<typeof import("@tumiki/mcp-core-proxy").createMcpClient>
        >["client"],
        transport,
        connect,
        listTools,
        close,
      };
    };

    test("接続IDからツール一覧を取得して返す", async () => {
      vi.mocked(mcpRepository.findConnectionByIdWithServer).mockResolvedValue(
        buildConnectionWithServer({
          name: "Notion",
          slug: "notion",
          transportType: "SSE",
          command: null,
          url: "https://notion.example.com/sse",
          authType: "BEARER",
          credentials: '{"token":"xyz"}',
        }),
      );
      const mock = createMockClient({
        tools: [
          {
            name: "search",
            description: "検索",
            inputSchema: { type: "object" },
          },
        ],
      });
      vi.mocked(createMcpClient).mockReturnValue({
        client: mock.client,
        transport: mock.transport,
      });

      const tools = await mcpProxyService.fetchToolsForConnection(100);

      expect(tools).toStrictEqual([
        {
          name: "search",
          description: "検索",
          inputSchema: { type: "object" },
        },
      ]);
      expect(mock.connect).toHaveBeenCalledTimes(1);
      expect(mock.listTools).toHaveBeenCalledTimes(1);
      // 取得後は必ず close が呼ばれる
      expect(mock.close).toHaveBeenCalledTimes(1);
    });

    test("接続が存在しない場合はエラーを投げる", async () => {
      vi.mocked(mcpRepository.findConnectionByIdWithServer).mockResolvedValue(
        null,
      );

      await expect(
        mcpProxyService.fetchToolsForConnection(999),
      ).rejects.toThrow("接続(id=999)が見つかりません");
      expect(createMcpClient).not.toHaveBeenCalled();
    });

    test("listTools失敗時もclient.close()が呼ばれる", async () => {
      vi.mocked(mcpRepository.findConnectionByIdWithServer).mockResolvedValue(
        buildConnectionWithServer(),
      );
      const mock = createMockClient({
        listError: new Error("MCPサーバーがツールに対応していない"),
      });
      vi.mocked(createMcpClient).mockReturnValue({
        client: mock.client,
        transport: mock.transport,
      });

      await expect(
        mcpProxyService.fetchToolsForConnection(100),
      ).rejects.toThrow("MCPサーバーがツールに対応していない");

      expect(mock.close).toHaveBeenCalledTimes(1);
    });

    test("タイムアウト経過時はエラーを投げ client.close() が呼ばれる", async () => {
      // 実タイマーを使用（fake timer + Promise.race + 永遠ペンディングのconnect()
      // という組み合わせで unhandled rejection が誤検知されるため）。
      // タイムアウト値は5msに固定し、CI環境でも十分に決定論的に動作する。
      vi.mocked(mcpRepository.findConnectionByIdWithServer).mockResolvedValue(
        buildConnectionWithServer(),
      );
      const close = vi.fn().mockResolvedValue(undefined);
      const connect = vi.fn().mockReturnValue(new Promise(() => undefined));
      const listTools = vi.fn();
      vi.mocked(createMcpClient).mockReturnValue({
        client: {
          connect,
          listTools,
          close,
        } as unknown as Awaited<ReturnType<typeof createMcpClient>>["client"],
        transport: {} as never,
      });

      await expect(
        mcpProxyService.fetchToolsForConnection(100, { timeoutMs: 5 }),
      ).rejects.toThrow(/タイムアウト/);

      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
