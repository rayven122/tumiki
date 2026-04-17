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

// テスト対象のインポート（モックの後に行う）
import * as mcpProxyService from "../mcp-proxy.service";
import { getDb } from "../../../shared/db";
import * as mcpRepository from "../../mcp-server-list/mcp.repository";
import { decryptToken } from "../../../utils/encryption";
import { decryptCredentials } from "../../../utils/credentials";

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
  });
});
