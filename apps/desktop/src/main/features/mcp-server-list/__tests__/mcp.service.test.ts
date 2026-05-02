import { describe, test, expect, beforeEach, vi } from "vitest";
import type {
  CreateFromCatalogInput,
  CreateVirtualServerInput,
} from "../mcp.types";

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
vi.mock("../../catalog/catalog.repository");
vi.mock("../../../utils/encryption");
vi.mock("../../../utils/credentials");
// generateRandomSuffix のみモック（toSlug の本体は維持）
// パスは mcp.service.ts の import "../../../shared/mcp.slug" と同じターゲットを指す必要がある
// （test file は __tests__/ 配下のため4階層上がる）
vi.mock("../../../../shared/mcp.slug", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../shared/mcp.slug")
  >("../../../../shared/mcp.slug");
  return {
    ...actual,
    generateRandomSuffix: vi.fn(() => "x7k2"),
  };
});

// テスト対象のインポート（モックの後に行う）
import * as mcpService from "../mcp.service";
import { getDb } from "../../../shared/db";
import * as mcpRepository from "../mcp.repository";
import { encryptToken, decryptToken } from "../../../utils/encryption";
import { decryptCredentials } from "../../../utils/credentials";

describe("mcp.service", () => {
  // $transactionモック: コールバックにmockDb自身をtxとして渡してそのまま実行
  const mockDb = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockDb),
    ),
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    // encryptToken: "encrypted:{入力}" を返す
    vi.mocked(encryptToken).mockImplementation(async (v) => `encrypted:${v}`);
    // decryptToken: "encrypted:" プレフィックスを除去して返す
    vi.mocked(decryptToken).mockImplementation(async (v) =>
      v.replace(/^encrypted:/, ""),
    );
    // decryptCredentials: デフォルトでは入力をそのまま返す（平文扱い）
    vi.mocked(decryptCredentials).mockImplementation(async (v) => v);
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

    test("名前が日本語のみの場合はslugに乱数フォールバックを採用する", async () => {
      // 日本語のみの catalogName → toSlug() が空文字を返すため connector-{乱数} が使われる
      // generateRandomSuffix モックは "x7k2" を返すため最終slugは "connector-x7k2"
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 4,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createFromCatalog({
        ...input,
        catalogName: "テスト用コネクタ",
      });

      expect(result).toStrictEqual({
        serverId: 4,
        serverName: "テスト用コネクタ",
      });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          name: "テスト用コネクタ",
          slug: "connector-x7k2",
        }),
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ slug: "connector-x7k2" }),
      );
    });

    test("乱数フォールバックslugが万が一既存と衝突した場合はサフィックスで回避する", async () => {
      // 衝突保険ロジックの検証（実用上は乱数で回避されるが念のため担保）
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug)
        .mockResolvedValueOnce({
          id: 77,
        } as Awaited<ReturnType<typeof mcpRepository.findServerBySlug>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 5,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createFromCatalog({
        ...input,
        catalogName: "テスト用コネクタ",
      });

      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ slug: "connector-x7k2-1" }),
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

  describe("createVirtualServer", () => {
    type SourceConnection = Awaited<
      ReturnType<typeof mcpRepository.findConnectionsByIds>
    >[number];

    const buildSourceConnection = (
      overrides: Partial<SourceConnection>,
    ): SourceConnection =>
      ({
        id: 1,
        name: "GitHub",
        slug: "github",
        transportType: "STDIO",
        command: "npx",
        args: '["@modelcontextprotocol/server-github"]',
        url: null,
        credentials: "encrypted:{}",
        authType: "API_KEY",
        isEnabled: true,
        displayOrder: 0,
        serverId: 100,
        catalogId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        server: {
          id: 100,
          name: "GitHub",
          slug: "github",
          description: "",
          serverStatus: "STOPPED",
          isEnabled: true,
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...overrides,
      }) as unknown as SourceConnection;

    const baseInput: CreateVirtualServerInput = {
      name: "週次レポート",
      description: "GitHubとSlackを束ねた仮想MCP",
      connections: [{ connectionId: 1 }, { connectionId: 2 }],
    };

    test("既存コネクタの設定をコピーして仮想MCPサーバーを作成する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({
          id: 1,
          name: "GitHub",
          credentials: "encrypted:gh",
        }),
        buildSourceConnection({
          id: 2,
          name: "Slack",
          command: null,
          url: "https://slack.example.com/sse",
          transportType: "SSE",
          authType: "BEARER",
          credentials: "encrypted:slack",
          serverId: 101,
          catalogId: 2,
        }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createVirtualServer(baseInput);

      expect(result).toStrictEqual({
        serverId: 10,
        serverName: "週次レポート",
      });
      expect(mcpRepository.createServer).toHaveBeenCalledTimes(1);
      expect(mcpRepository.createConnection).toHaveBeenCalledTimes(2);

      // 1つ目: GitHub (STDIO/API_KEY) - 暗号化blobをそのままコピー
      expect(mcpRepository.createConnection).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({
          name: "GitHub",
          slug: "github",
          transportType: "STDIO",
          command: "npx",
          authType: "API_KEY",
          serverId: 10,
          catalogId: 1,
          displayOrder: 0,
          credentials: "encrypted:gh",
        }),
      );
      // 2つ目: Slack (SSE/BEARER)
      expect(mcpRepository.createConnection).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({
          name: "Slack",
          slug: "slack",
          transportType: "SSE",
          url: "https://slack.example.com/sse",
          authType: "BEARER",
          serverId: 10,
          catalogId: 2,
          displayOrder: 1,
          credentials: "encrypted:slack",
        }),
      );
    });

    test("既存コネクタの暗号化済みcredentialsをそのまま転送し、再暗号化しない", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({
          id: 1,
          credentials: "safe:already-encrypted-blob",
        }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      expect(encryptToken).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          credentials: "safe:already-encrypted-blob",
        }),
      );
    });

    test("接続が0件の場合はエラーを投げる", async () => {
      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [],
        }),
      ).rejects.toThrow("仮想MCPには1つ以上の接続が必要です");
    });

    test("接続がちょうど最大件数（10件）の場合は成功する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const maxConnections = Array.from({ length: 10 }, () => ({
        connectionId: 1,
      }));
      const result = await mcpService.createVirtualServer({
        ...baseInput,
        connections: maxConnections,
      });

      expect(result).toStrictEqual({
        serverId: 10,
        serverName: "週次レポート",
      });
      expect(mcpRepository.createConnection).toHaveBeenCalledTimes(10);
    });

    test("接続が最大件数（10件）を超える場合はエラーを投げる", async () => {
      const tooManyConnections = Array.from({ length: 11 }, () => ({
        connectionId: 1,
      }));
      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: tooManyConnections,
        }),
      ).rejects.toThrow("接続は最大10件までです");
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("コネクタが見つからない場合はエラーを投げる（書き込みI/Oは一切起きない）", async () => {
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([]);

      await expect(mcpService.createVirtualServer(baseInput)).rejects.toThrow(
        "コネクタ(id=1)が見つかりません",
      );
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("OAuthコネクタが含まれる場合はエラーを投げる（書き込みI/Oは起きない）", async () => {
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "Notion", authType: "OAUTH" }),
      ]);

      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [{ connectionId: 1 }],
        }),
      ).rejects.toThrow(
        "OAuth認証のコネクタ「Notion」は仮想MCP作成では未対応です",
      );
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("同一コネクタを複数選択した場合は接続slugにサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "GitHub" }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }, { connectionId: 1 }],
      });

      expect(mcpRepository.createConnection).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ slug: "github" }),
      );
      expect(mcpRepository.createConnection).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ slug: "github-1" }),
      );
    });

    test("サーバー名重複時はサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName)
        .mockResolvedValueOnce({
          id: 99,
        } as Awaited<ReturnType<typeof mcpRepository.findServerByName>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 11,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      expect(result.serverName).toBe("週次レポート 2");
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: "週次レポート 2" }),
      );
    });

    test("サーバー名が日本語のみの場合はサーバーslugに乱数フォールバックを採用する", async () => {
      // 仮想MCPはサーバー名がフリー入力のため、日本語のみで作成されるケースを担保する
      // generateRandomSuffix モックは "x7k2" を返すため最終slugは "connector-x7k2"
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 12,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        name: "週次レポート",
        connections: [{ connectionId: 1 }],
      });

      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: "connector-x7k2" }),
      );
    });

    test("コネクタ名が日本語のみの場合は接続slugに乱数フォールバックを採用する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 13,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "テスト用コネクタ" }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 1000,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }, { connectionId: 1 }],
      });

      // 1件目: 乱数フォールバック / 2件目: 同一コネクタで baseSlug 衝突 → サフィックス付与
      expect(mcpRepository.createConnection).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ slug: "connector-x7k2" }),
      );
      expect(mcpRepository.createConnection).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ slug: "connector-x7k2-1" }),
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
      vi.mocked(decryptCredentials).mockResolvedValue(
        '{"API_KEY":"decrypted"}',
      );

      const result = await mcpService.getAllServers();

      expect(decryptCredentials).toHaveBeenCalledTimes(2);
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
      vi.mocked(decryptCredentials).mockImplementation(async (v) => v);

      const result = await mcpService.getAllServers();

      expect(result[0]?.connections[0]?.credentials).toBe(plainCredentials);
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

  describe("buildToolPolicyMap", () => {
    test("McpToolレコードから configName::toolName 形式のポリシーマップを返す", async () => {
      vi.mocked(mcpRepository.findToolsByServerSlug).mockResolvedValue([
        {
          id: 1,
          name: "read_file",
          isAllowed: true,
          customDescription: "上書き済み",
          connection: {
            slug: "filesystem",
            server: { slug: "my-bundle" },
          },
        },
        {
          id: 2,
          name: "delete_file",
          isAllowed: false,
          customDescription: null,
          connection: {
            slug: "filesystem",
            server: { slug: "my-bundle" },
          },
        },
      ] as unknown as Awaited<
        ReturnType<typeof mcpRepository.findToolsByServerSlug>
      >);

      const map = await mcpService.buildToolPolicyMap("my-bundle");

      expect(map.get("my-bundle-filesystem::read_file")).toStrictEqual({
        isAllowed: true,
        customDescription: "上書き済み",
      });
      expect(map.get("my-bundle-filesystem::delete_file")).toStrictEqual({
        isAllowed: false,
        customDescription: undefined,
      });
    });

    test("空文字の customDescription は undefined として扱う（上書きなし）", async () => {
      vi.mocked(mcpRepository.findToolsByServerSlug).mockResolvedValue([
        {
          id: 1,
          name: "tool-a",
          isAllowed: true,
          customDescription: "   ",
          connection: { slug: "conn", server: { slug: "srv" } },
        },
      ] as unknown as Awaited<
        ReturnType<typeof mcpRepository.findToolsByServerSlug>
      >);

      const map = await mcpService.buildToolPolicyMap("srv");

      expect(map.get("srv-conn::tool-a")).toStrictEqual({
        isAllowed: true,
        customDescription: undefined,
      });
    });

    test("McpToolレコードがない場合は空マップを返す", async () => {
      vi.mocked(mcpRepository.findToolsByServerSlug).mockResolvedValue([]);

      const map = await mcpService.buildToolPolicyMap("empty-server");

      expect(map.size).toStrictEqual(0);
    });
  });

  describe("createVirtualServer with tools", () => {
    type SourceConnection = Awaited<
      ReturnType<typeof mcpRepository.findConnectionsByIds>
    >[number];

    const buildSourceConnection = (
      overrides: Partial<SourceConnection>,
    ): SourceConnection =>
      ({
        id: 1,
        name: "GitHub",
        slug: "github",
        transportType: "STDIO",
        command: "npx",
        args: "[]",
        url: null,
        credentials: "encrypted:{}",
        authType: "API_KEY",
        isEnabled: true,
        displayOrder: 0,
        serverId: 100,
        catalogId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        server: {
          id: 100,
          name: "GitHub",
          slug: "github",
          description: "",
          serverStatus: "STOPPED",
          isEnabled: true,
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...overrides,
      }) as unknown as SourceConnection;

    const setupCommonMocks = (): void => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIds).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "GitHub" }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpRepository.createTools).mockResolvedValue();
    };

    test("toolsが指定されている場合は McpTool レコードを保存する", async () => {
      setupCommonMocks();

      await mcpService.createVirtualServer({
        name: "週次レポート",
        description: "",
        connections: [
          {
            connectionId: 1,
            tools: [
              {
                name: "create_issue",
                description: "Issue を作成する",
                inputSchema: '{"type":"object"}',
                isAllowed: true,
                customDescription: "課題追跡用",
              },
              {
                name: "delete_repo",
                description: "リポジトリを削除する",
                inputSchema: "{}",
                isAllowed: false,
              },
            ],
          },
        ],
      });

      expect(mcpRepository.createTools).toHaveBeenCalledWith(
        expect.anything(),
        [
          {
            name: "create_issue",
            description: "Issue を作成する",
            inputSchema: '{"type":"object"}',
            isAllowed: true,
            customDescription: "課題追跡用",
            connectionId: 100,
          },
          {
            name: "delete_repo",
            description: "リポジトリを削除する",
            inputSchema: "{}",
            isAllowed: false,
            customDescription: null,
            connectionId: 100,
          },
        ],
      );
    });

    test("空文字の customDescription は null に正規化して保存する", async () => {
      setupCommonMocks();

      await mcpService.createVirtualServer({
        name: "週次レポート",
        description: "",
        connections: [
          {
            connectionId: 1,
            tools: [
              {
                name: "tool-a",
                description: "",
                inputSchema: "{}",
                isAllowed: true,
                customDescription: "   ",
              },
            ],
          },
        ],
      });

      expect(mcpRepository.createTools).toHaveBeenCalledWith(
        expect.anything(),
        [
          expect.objectContaining({
            name: "tool-a",
            customDescription: null,
          }),
        ],
      );
    });

    test("toolsが未指定の場合は createTools を呼ばない（後方互換）", async () => {
      setupCommonMocks();

      await mcpService.createVirtualServer({
        name: "週次レポート",
        description: "",
        connections: [{ connectionId: 1 }],
      });

      expect(mcpRepository.createTools).not.toHaveBeenCalled();
    });

    test("toolsが空配列の場合も createTools を呼ばない", async () => {
      setupCommonMocks();

      await mcpService.createVirtualServer({
        name: "週次レポート",
        description: "",
        connections: [{ connectionId: 1, tools: [] }],
      });

      expect(mcpRepository.createTools).not.toHaveBeenCalled();
    });
  });
});
