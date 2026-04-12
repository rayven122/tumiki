import { describe, test, expect, beforeEach, vi } from "vitest";
import type { CreateFromCatalogInput } from "../mcp.types";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../mcp.repository");
vi.mock("../../../utils/encryption");

// テスト対象のインポート（モックの後に行う）
import * as mcpService from "../mcp.service";
import { getDb } from "../../../shared/db";
import * as mcpRepository from "../mcp.repository";
import { encryptToken, decryptToken } from "../../../utils/encryption";

describe("mcp.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    // encryptToken: "encrypted:{入力}" を返す
    vi.mocked(encryptToken).mockImplementation(async (v) => `encrypted:${v}`);
    // decryptToken: "encrypted:" プレフィックスを除去して返す
    vi.mocked(decryptToken).mockImplementation(async (v) =>
      v.replace(/^encrypted:/, ""),
    );
  });

  describe("createFromCatalog", () => {
    const input: CreateFromCatalogInput = {
      catalogId: 1,
      catalogName: "Test MCP",
      description: "テスト用MCP",
      transportType: "STDIO",
      command: "npx",
      args: '["test-server"]',
      url: null,
      credentialKeys: ["API_KEY"],
      credentials: { API_KEY: "test-key" },
      authType: "API_KEY",
    };

    test("カタログからMCPサーバーと接続を作成する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 1, serverName: "Test MCP" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(mockDb, {
        name: "Test MCP",
        slug: "test-mcp",
        description: "テスト用MCP",
      });
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(mockDb, {
        name: "Test MCP",
        slug: "test-mcp",
        transportType: "STDIO",
        command: "npx",
        args: '["test-server"]',
        url: null,
        credentials: `encrypted:${JSON.stringify({ API_KEY: "test-key" })}`,
        authType: "API_KEY",
        serverId: 1,
        catalogId: 1,
      });
    });

    test("サーバー名重複時にサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName)
        .mockResolvedValueOnce({
          id: 99,
        } as Awaited<ReturnType<typeof mcpRepository.findServerByName>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 2,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 2, serverName: "Test MCP 2" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ name: "Test MCP 2", slug: "test-mcp-2" }),
      );
    });

    test("slug重複時にサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug)
        .mockResolvedValueOnce({
          id: 99,
        } as Awaited<ReturnType<typeof mcpRepository.findServerBySlug>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 3,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 3, serverName: "Test MCP" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ slug: "test-mcp-1" }),
      );
    });

    test("credentialsを暗号化してJSON文字列で保存する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createFromCatalog(input);

      expect(encryptToken).toHaveBeenCalledWith('{"API_KEY":"test-key"}');
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          credentials: 'encrypted:{"API_KEY":"test-key"}',
        }),
      );
    });
  });

  describe("getAllServers", () => {
    test("全サーバーを取得する", async () => {
      const mockServers = [
        { id: 1, name: "Server A", connections: [] },
        { id: 2, name: "Server B", connections: [] },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );

      const result = await mcpService.getAllServers();

      expect(result).toStrictEqual(mockServers);
      expect(mcpRepository.findAllWithConnections).toHaveBeenCalledWith(mockDb);
    });

    test("暗号化されたcredentialsを復号して返す", async () => {
      const mockServers = [
        {
          id: 1,
          name: "Server A",
          connections: [
            { id: 1, credentials: "safe:encrypted-data" },
            { id: 2, credentials: "fallback:encrypted-data" },
          ],
        },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );
      vi.mocked(decryptToken).mockResolvedValue('{"API_KEY":"decrypted"}');

      const result = await mcpService.getAllServers();

      expect(decryptToken).toHaveBeenCalledTimes(2);
      expect(result[0]?.connections[0]?.credentials).toBe(
        '{"API_KEY":"decrypted"}',
      );
      expect(result[0]?.connections[1]?.credentials).toBe(
        '{"API_KEY":"decrypted"}',
      );
    });

    test("平文の既存credentialsはそのまま返す（マイグレーション互換）", async () => {
      const plainCredentials = '{"API_KEY":"plain-text-key"}';
      const mockServers = [
        {
          id: 1,
          name: "Server A",
          connections: [{ id: 1, credentials: plainCredentials }],
        },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );

      const result = await mcpService.getAllServers();

      expect(decryptToken).not.toHaveBeenCalled();
      expect(result[0]?.connections[0]?.credentials).toBe(plainCredentials);
    });
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
      // decryptTokenの振る舞い: "safe:" プレフィックスを除去（beforeEachのモックでは
      // "encrypted:" のみ剥がすため、ここで上書き）
      vi.mocked(decryptToken).mockImplementation(async (v) =>
        v.replace(/^safe:/, "").replace(/^fallback:/, ""),
      );

      const result = await mcpService.getEnabledConfigs();

      // セパレータは `-`（Anthropic API の tool name 制約で `/` は使えないため）
      expect(result).toStrictEqual([
        {
          name: "test-server-serena",
          command: "uvx",
          args: ["serena", "start-mcp-server"],
          env: { API_KEY: "test-key" },
        },
      ]);
      // decryptTokenが暗号化済みcredentialsに対して呼び出されることを確認
      expect(decryptToken).toHaveBeenCalledWith('safe:{"API_KEY":"test-key"}');
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

      const result = await mcpService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "srv-plain",
          command: "echo",
          args: [],
          env: { TOKEN: "plain" },
        },
      ]);
      // プレフィックスなしなのでdecryptTokenは呼ばれない
      expect(decryptToken).not.toHaveBeenCalled();
    });

    test("SSE接続はスキップする", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([
        buildConnection({
          name: "SSE Server",
          slug: "sse-server",
          transportType: "SSE",
          command: null,
          url: "http://localhost:3000/sse",
        }),
      ]);

      const result = await mcpService.getEnabledConfigs();

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

      const result = await mcpService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });

    test("接続が0件の場合は空配列を返す", async () => {
      vi.mocked(mcpRepository.findEnabledConnections).mockResolvedValue([]);

      const result = await mcpService.getEnabledConfigs();

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

      const result = await mcpService.getEnabledConfigs();

      expect(result).toStrictEqual([
        {
          name: "good-srv-good",
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

      const result = await mcpService.getEnabledConfigs();

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

      const result = await mcpService.getEnabledConfigs();

      expect(result).toStrictEqual([]);
    });
  });

  describe("updateServer", () => {
    test("サーバー情報を更新する", async () => {
      const mockUpdated = { id: 1, name: "Updated" };
      vi.mocked(mcpRepository.updateServer).mockResolvedValue(
        mockUpdated as Awaited<ReturnType<typeof mcpRepository.updateServer>>,
      );

      const result = await mcpService.updateServer(1, { name: "Updated" });

      expect(result).toStrictEqual(mockUpdated);
      expect(mcpRepository.updateServer).toHaveBeenCalledWith(mockDb, 1, {
        name: "Updated",
      });
    });
  });

  describe("deleteServer", () => {
    test("サーバーを削除する", async () => {
      vi.mocked(mcpRepository.deleteServer).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.deleteServer>>,
      );

      await mcpService.deleteServer(1);

      expect(mcpRepository.deleteServer).toHaveBeenCalledWith(mockDb, 1);
    });
  });

  describe("toggleServer", () => {
    test("サーバーのenabled状態を切り替える", async () => {
      const mockToggled = { id: 1, isEnabled: false };
      vi.mocked(mcpRepository.toggleServerEnabled).mockResolvedValue(
        mockToggled as Awaited<
          ReturnType<typeof mcpRepository.toggleServerEnabled>
        >,
      );

      const result = await mcpService.toggleServer(1, false);

      expect(result).toStrictEqual(mockToggled);
      expect(mcpRepository.toggleServerEnabled).toHaveBeenCalledWith(
        mockDb,
        1,
        false,
      );
    });
  });
});
