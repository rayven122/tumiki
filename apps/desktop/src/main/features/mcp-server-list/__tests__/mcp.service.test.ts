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
import * as catalogRepository from "../../catalog/catalog.repository";
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
    type CatalogRow = Awaited<ReturnType<typeof catalogRepository.findById>>;

    const buildCatalog = (overrides: Partial<NonNullable<CatalogRow>>) =>
      ({
        id: 1,
        name: "GitHub",
        description: "",
        iconPath: null,
        transportType: "STDIO",
        command: "npx",
        args: '["@modelcontextprotocol/server-github"]',
        url: null,
        credentialKeys: '["GITHUB_TOKEN"]',
        authType: "API_KEY",
        isOfficial: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      }) as NonNullable<CatalogRow>;

    const baseInput: CreateVirtualServerInput = {
      name: "週次レポート",
      description: "GitHubとSlackを束ねた仮想MCP",
      connections: [
        {
          catalogId: 1,
          credentials: { GITHUB_TOKEN: "gh-token" },
        },
        {
          catalogId: 2,
          credentials: { SLACK_TOKEN: "slack-token" },
        },
      ],
    };

    test("複数カタログを束ねた仮想MCPサーバーを作成する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(catalogRepository.findById)
        .mockResolvedValueOnce(buildCatalog({ id: 1, name: "GitHub" }))
        .mockResolvedValueOnce(
          buildCatalog({
            id: 2,
            name: "Slack",
            command: null,
            url: "https://slack.example.com/sse",
            transportType: "SSE",
            credentialKeys: '["SLACK_TOKEN"]',
            authType: "BEARER",
          }),
        );
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createVirtualServer(baseInput);

      expect(result).toStrictEqual({
        serverId: 10,
        serverName: "週次レポート",
      });
      expect(mcpRepository.createServer).toHaveBeenCalledTimes(1);
      expect(mcpRepository.createConnection).toHaveBeenCalledTimes(2);

      // 1つ目: GitHub (STDIO/API_KEY)
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
          credentials: `encrypted:${JSON.stringify({ GITHUB_TOKEN: "gh-token" })}`,
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

    test("接続が最大件数（10件）を超える場合はエラーを投げる", async () => {
      // ドメインルールはサービス層でも保証する（IPC層のZodだけに依存しない）
      const tooManyConnections = Array.from({ length: 11 }, () => ({
        catalogId: 1,
        credentials: { GITHUB_TOKEN: "x" },
      }));
      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: tooManyConnections,
        }),
      ).rejects.toThrow("接続は最大10件までです");
      // バリデーション失敗のため書き込みI/Oは一切起きない
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("カタログが見つからない場合はエラーを投げる（tx外で検証されサーバーは作成されない）", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(catalogRepository.findById).mockResolvedValue(null);

      await expect(mcpService.createVirtualServer(baseInput)).rejects.toThrow(
        "カタログ(id=1)が見つかりません",
      );
      // tx外でバリデーション失敗するため、書き込みI/Oは一切起きない
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("途中の接続でカタログが見つからない場合は書き込みI/Oが一切起きない", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      // 1件目は正常、2件目で失敗
      vi.mocked(catalogRepository.findById)
        .mockResolvedValueOnce(buildCatalog({ id: 1, name: "GitHub" }))
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await expect(mcpService.createVirtualServer(baseInput)).rejects.toThrow(
        "カタログ(id=2)が見つかりません",
      );
      // tx外でバリデーション失敗するため、createServer/createConnectionとも呼ばれない
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("OAuthカタログが含まれる場合はエラーを投げる（書き込みI/Oは起きない）", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(catalogRepository.findById).mockResolvedValue(
        buildCatalog({ id: 1, name: "Notion", authType: "OAUTH" }),
      );

      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [{ catalogId: 1, credentials: {} }],
        }),
      ).rejects.toThrow(
        "OAuth認証のカタログ「Notion」は仮想MCP作成では未対応です",
      );
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("バリデーション失敗時は暗号化処理が呼ばれない（fail fast）", async () => {
      vi.mocked(catalogRepository.findById).mockResolvedValue(null);

      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [{ catalogId: 1, credentials: { GITHUB_TOKEN: "a" } }],
        }),
      ).rejects.toThrow("カタログ(id=1)が見つかりません");
      expect(encryptToken).not.toHaveBeenCalled();
    });

    test("同一カタログを複数追加した場合は接続slugにサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(catalogRepository.findById).mockResolvedValue(
        buildCatalog({ id: 1, name: "GitHub" }),
      );
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [
          { catalogId: 1, credentials: { GITHUB_TOKEN: "a" } },
          { catalogId: 1, credentials: { GITHUB_TOKEN: "b" } },
        ],
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
      vi.mocked(catalogRepository.findById).mockResolvedValue(
        buildCatalog({ id: 1 }),
      );
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      const result = await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ catalogId: 1, credentials: { GITHUB_TOKEN: "x" } }],
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
      vi.mocked(catalogRepository.findById).mockResolvedValue(
        buildCatalog({ id: 1 }),
      );
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createVirtualServer({
        ...baseInput,
        name: "週次レポート",
        connections: [{ catalogId: 1, credentials: { GITHUB_TOKEN: "x" } }],
      });

      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: "connector-x7k2" }),
      );
    });

    test("接続カタログ名が日本語のみの場合は接続slugに乱数フォールバックを採用する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 13,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(catalogRepository.findById).mockResolvedValue(
        buildCatalog({ id: 1, name: "テスト用コネクタ" }),
      );
      vi.mocked(mcpRepository.createConnection).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.createConnection>>,
      );

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [
          { catalogId: 1, credentials: { GITHUB_TOKEN: "a" } },
          { catalogId: 1, credentials: { GITHUB_TOKEN: "b" } },
        ],
      });

      // 1件目: 乱数フォールバック / 2件目: 同一カタログで baseSlug 衝突 → サフィックス付与
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
});
