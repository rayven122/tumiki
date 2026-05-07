import { describe, test, expect, beforeEach, vi } from "vitest";
import type {
  CreateFromCatalogInput,
  CreateFromManagerCatalogInput,
  CreateCustomServerInput,
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
vi.mock("../../mcp-proxy/mcp-proxy.service");
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
import * as mcpProxyService from "../../mcp-proxy/mcp-proxy.service";
import { encryptToken, decryptToken } from "../../../utils/encryption";
import { decryptCredentials } from "../../../utils/credentials";

describe("mcp.service", () => {
  // $transactionモック: コールバックにmockDb自身をtxとして渡してそのまま実行
  const mockDb = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockDb),
    ),
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  // 複数の describe ブロックで使い回す共通型エイリアス
  type ConnectionWithTools = Awaited<
    ReturnType<typeof mcpRepository.findConnectionsByIdsWithTools>
  >[number];

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
    // ツール取得はデフォルトで空配列（外部MCPに繋がず、登録ロジックのみ検証する）
    vi.mocked(mcpProxyService.fetchToolsForConnection).mockResolvedValue([]);
    // createTools はデフォルトで0件成功扱い
    vi.mocked(mcpRepository.createTools).mockResolvedValue({ count: 0 });
    // createSecret はデフォルトで id=1 を返す（カタログ/カスタム入力経路は 1接続=1secret）
    vi.mocked(mcpRepository.createSecret).mockResolvedValue({
      id: 1,
      credentials: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // deleteSecretIfOrphaned / findSecretIdsByServerId はサーバー削除系で使用
    vi.mocked(mcpRepository.deleteSecretIfOrphaned).mockResolvedValue();
    vi.mocked(mcpRepository.findSecretIdsByServerId).mockResolvedValue([]);
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
      vi.mocked(mcpRepository.createSecret).mockResolvedValue({
        id: 50,
        credentials: `encrypted:${JSON.stringify({ API_KEY: "test-key" })}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createFromCatalog(input);

      expect(result).toStrictEqual({ serverId: 1, serverName: "Test MCP" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(mockDb, {
        name: "Test MCP",
        slug: "test-mcp",
        description: "テスト用MCP",
        serverType: "OFFICIAL",
      });
      // createSecret には暗号化済み credentials を渡す
      expect(mcpRepository.createSecret).toHaveBeenCalledWith(
        mockDb,
        `encrypted:${JSON.stringify({ API_KEY: "test-key" })}`,
      );
      // createConnection には secretId（=50）を渡し、credentials はもう含めない
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(mockDb, {
        name: "Test MCP",
        slug: "test-mcp",
        transportType: "STDIO",
        command: "npx",
        args: '["test-server"]',
        url: null,
        secretId: 50,
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
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

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
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

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
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

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
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createFromCatalog({
        ...input,
        catalogName: "テスト用コネクタ",
      });

      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ slug: "connector-x7k2-1" }),
      );
    });

    test("credentialsを暗号化して McpSecret に保存し、接続には secretId を渡す", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createSecret).mockResolvedValue({
        id: 99,
        credentials: 'encrypted:{"API_KEY":"test-key"}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createFromCatalog(input);

      expect(encryptToken).toHaveBeenCalledWith('{"API_KEY":"test-key"}');
      expect(mcpRepository.createSecret).toHaveBeenCalledWith(
        mockDb,
        'encrypted:{"API_KEY":"test-key"}',
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ secretId: 99 }),
      );
    });

    test("登録直後にツール一覧を取得し、McpToolテーブルに保存する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpProxyService.fetchToolsForConnection).mockResolvedValue([
        {
          name: "search",
          description: "検索ツール",
          inputSchema: {
            type: "object",
            properties: { q: { type: "string" } },
          },
        },
        // descriptionが未定義のケース（McpToolInfo.description は省略可）
        { name: "raw", inputSchema: {} },
      ]);

      await mcpService.createFromCatalog(input);

      expect(mcpProxyService.fetchToolsForConnection).toHaveBeenCalledWith(100);
      expect(mcpRepository.createTools).toHaveBeenCalledWith(mockDb, [
        {
          name: "search",
          description: "検索ツール",
          inputSchema: JSON.stringify({
            type: "object",
            properties: { q: { type: "string" } },
          }),
          connectionId: 100,
        },
        {
          name: "raw",
          description: "",
          inputSchema: JSON.stringify({}),
          connectionId: 100,
        },
      ]);
    });

    test("ツール取得が失敗してもサーバー登録は成功する（DBへの保存はスキップ）", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpProxyService.fetchToolsForConnection).mockRejectedValue(
        new Error("MCP接続に失敗"),
      );

      const result = await mcpService.createFromCatalog(input);

      // 登録自体は成功（呼び出し元へエラーを伝播しない）
      expect(result).toStrictEqual({ serverId: 1, serverName: "Test MCP" });
      // ツール保存はスキップされる
      expect(mcpRepository.createTools).not.toHaveBeenCalled();
    });

    test("ツール取得結果が0件の場合は createTools を呼ばない", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpProxyService.fetchToolsForConnection).mockResolvedValue([]);

      await mcpService.createFromCatalog(input);

      expect(mcpRepository.createTools).not.toHaveBeenCalled();
    });
  });

  describe("createFromManagerCatalog", () => {
    const input: CreateFromManagerCatalogInput = {
      catalogId: "github",
      serverName: "GitHub",
      description: "GitHub MCP",
      status: "available",
      permissions: { read: true, write: false, execute: true },
      connectionTemplate: {
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: [],
        url: "https://api.githubcopilot.com/mcp/",
        authType: "BEARER",
        credentialKeys: ["GITHUB_TOKEN"],
      },
      tools: [{ name: "list_repos", allowed: true }],
      credentials: { GITHUB_TOKEN: "test-token" },
    };

    test("ManagerカタログからcatalogId nullの接続を作成する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createSecret).mockResolvedValue({
        id: 60,
        credentials: `encrypted:${JSON.stringify({ GITHUB_TOKEN: "test-token" })}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 101,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createFromManagerCatalog(input);

      expect(result).toStrictEqual({ serverId: 10, serverName: "GitHub" });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(mockDb, {
        name: "GitHub",
        slug: "github",
        description: "GitHub MCP",
        serverType: "OFFICIAL",
      });
      expect(mcpRepository.createSecret).toHaveBeenCalledWith(
        mockDb,
        `encrypted:${JSON.stringify({ GITHUB_TOKEN: "test-token" })}`,
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(mockDb, {
        name: "GitHub",
        slug: "github",
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: "[]",
        url: "https://api.githubcopilot.com/mcp/",
        secretId: 60,
        authType: "BEARER",
        serverId: 10,
        catalogId: null,
      });
    });

    test("availableかつexecute権限がない場合は作成しない", async () => {
      await expect(
        mcpService.createFromManagerCatalog({
          ...input,
          permissions: { read: true, write: false, execute: false },
        }),
      ).rejects.toThrow("このカタログは追加できません");

      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });
  });

  describe("createCustomServer", () => {
    const input: CreateCustomServerInput = {
      serverName: "My Remote MCP",
      url: "https://mcp.example.com/stream",
      transportType: "STREAMABLE_HTTP",
      authType: "NONE",
      credentials: {},
    };

    test("カスタムURLでサーバーが作成される（NONE認証、STREAMABLE_HTTP）", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createSecret).mockResolvedValue({
        id: 70,
        credentials: `encrypted:${JSON.stringify({})}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createCustomServer(input);

      expect(result).toStrictEqual({
        serverId: 1,
        serverName: "My Remote MCP",
      });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(mockDb, {
        name: "My Remote MCP",
        slug: "my-remote-mcp",
        description: "",
        serverType: "OFFICIAL",
      });
      expect(mcpRepository.createSecret).toHaveBeenCalledWith(
        mockDb,
        `encrypted:${JSON.stringify({})}`,
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(mockDb, {
        name: "My Remote MCP",
        slug: "my-remote-mcp",
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: "[]",
        url: "https://mcp.example.com/stream",
        secretId: 70,
        authType: "NONE",
        serverId: 1,
        catalogId: null,
      });
    });

    test("APIキー認証でサーバーが作成される", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 2,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createSecret).mockResolvedValue({
        id: 71,
        credentials: `encrypted:${JSON.stringify({ API_KEY: "sk-12345" })}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 101,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const apiKeyInput: CreateCustomServerInput = {
        ...input,
        authType: "API_KEY",
        credentials: { API_KEY: "sk-12345" },
      };

      const result = await mcpService.createCustomServer(apiKeyInput);

      expect(result).toStrictEqual({
        serverId: 2,
        serverName: "My Remote MCP",
      });
      expect(encryptToken).toHaveBeenCalledWith(
        JSON.stringify({ API_KEY: "sk-12345" }),
      );
      expect(mcpRepository.createSecret).toHaveBeenCalledWith(
        mockDb,
        `encrypted:${JSON.stringify({ API_KEY: "sk-12345" })}`,
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          authType: "API_KEY",
          secretId: 71,
        }),
      );
    });

    test("OAuth認証でサーバーが作成される", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 3,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createSecret).mockResolvedValue({
        id: 72,
        credentials: `encrypted:${JSON.stringify({ access_token: "oauth-token-abc" })}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 102,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const oauthInput: CreateCustomServerInput = {
        ...input,
        authType: "OAUTH",
        credentials: { access_token: "oauth-token-abc" },
      };

      const result = await mcpService.createCustomServer(oauthInput);

      expect(result).toStrictEqual({
        serverId: 3,
        serverName: "My Remote MCP",
      });
      expect(mcpRepository.createSecret).toHaveBeenCalledWith(
        mockDb,
        `encrypted:${JSON.stringify({ access_token: "oauth-token-abc" })}`,
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          authType: "OAUTH",
          secretId: 72,
        }),
      );
    });

    test("重複名の場合サフィックスが付与される", async () => {
      vi.mocked(mcpRepository.findServerByName)
        .mockResolvedValueOnce({
          id: 99,
        } as Awaited<ReturnType<typeof mcpRepository.findServerByName>>)
        .mockResolvedValueOnce(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 4,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 103,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createCustomServer(input);

      expect(result).toStrictEqual({
        serverId: 4,
        serverName: "My Remote MCP 2",
      });
      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          name: "My Remote MCP 2",
          slug: "my-remote-mcp-2",
        }),
      );
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          name: "My Remote MCP 2",
          slug: "my-remote-mcp-2",
        }),
      );
    });

    test("ツール取得失敗してもサーバー登録は成功する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 5,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 104,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);
      vi.mocked(mcpProxyService.fetchToolsForConnection).mockRejectedValue(
        new Error("MCP接続に失敗"),
      );

      const result = await mcpService.createCustomServer(input);

      expect(result).toStrictEqual({
        serverId: 5,
        serverName: "My Remote MCP",
      });
      expect(mcpRepository.createTools).not.toHaveBeenCalled();
    });

    test("catalogIdがnullで作成される", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 6,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 105,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createCustomServer(input);

      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          catalogId: null,
          command: null,
          args: "[]",
        }),
      );
    });
  });

  describe("createVirtualServer", () => {
    const buildSourceConnection = (
      overrides: Partial<ConnectionWithTools>,
    ): ConnectionWithTools =>
      ({
        id: 1,
        name: "GitHub",
        slug: "github",
        transportType: "STDIO",
        command: "npx",
        args: '["@modelcontextprotocol/server-github"]',
        url: null,
        // 仮想MCPは元コネクタの secretId を共有して credentials を単一情報源化する
        secretId: 11,
        authType: "API_KEY",
        isEnabled: true,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        serverId: 1,
        catalogId: 1,
        tools: [],
        // findConnectionsByIdsWithTools が include する親サーバーの有効状態。
        // serverType は仮想MCP（CUSTOM）の再ネスト防止判定に使用しており、
        // デフォルトは単独コネクタ（OFFICIAL）として扱う。
        server: { isEnabled: true, serverType: "OFFICIAL" },
        ...overrides,
      }) as ConnectionWithTools;

    const baseInput: CreateVirtualServerInput = {
      name: "週次レポート",
      description: "GitHubとSlackを束ねた仮想MCP",
      connections: [{ connectionId: 1 }, { connectionId: 2 }],
    };

    test("複数の既存コネクタを束ねた仮想MCPサーバーを作成する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "GitHub", secretId: 11 }),
        buildSourceConnection({
          id: 2,
          name: "Slack",
          command: null,
          url: "https://slack.example.com/sse",
          transportType: "SSE",
          authType: "BEARER",
          secretId: 22,
          catalogId: 2,
        }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      const result = await mcpService.createVirtualServer(baseInput);

      expect(result).toStrictEqual({
        serverId: 10,
        serverName: "週次レポート",
      });
      expect(mcpRepository.createServer).toHaveBeenCalledTimes(1);
      expect(mcpRepository.createConnection).toHaveBeenCalledTimes(2);
      // 仮想MCP作成時は新規 secret を作らず、元コネクタの secretId を共有する
      expect(mcpRepository.createSecret).not.toHaveBeenCalled();

      // 1つ目: GitHub（元コネクタの secretId=11 を共有）
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
          secretId: 11,
        }),
      );
      // 2つ目: Slack（元コネクタの secretId=22 を共有）
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
          secretId: 22,
        }),
      );
    });

    test("元コネクタの McpTool を新接続にコピーし、isAllowed を継承する（allowedToolNames 未指定）", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({
          id: 1,
          tools: [
            {
              name: "tool-a",
              description: "desc-a",
              inputSchema: '{"a":1}',
              isAllowed: true,
            },
            {
              name: "tool-b",
              description: "desc-b",
              inputSchema: "{}",
              isAllowed: false,
            },
          ] as ConnectionWithTools["tools"],
        }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 200,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      expect(mcpRepository.createTools).toHaveBeenCalledWith(mockDb, [
        {
          name: "tool-a",
          description: "desc-a",
          inputSchema: '{"a":1}',
          connectionId: 200,
          isAllowed: true,
        },
        {
          name: "tool-b",
          description: "desc-b",
          inputSchema: "{}",
          connectionId: 200,
          isAllowed: false,
        },
      ]);
    });

    test("allowedToolNames 指定時は当該ツールのみ isAllowed=true で保存される", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({
          id: 1,
          tools: [
            {
              name: "tool-a",
              description: "",
              inputSchema: "{}",
              isAllowed: true,
            },
            {
              name: "tool-b",
              description: "",
              inputSchema: "{}",
              isAllowed: true,
            },
            {
              name: "tool-c",
              description: "",
              inputSchema: "{}",
              isAllowed: false,
            },
          ] as ConnectionWithTools["tools"],
        }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 300,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        // tool-a と tool-c のみ公開（tool-b は元 true でも非公開へ、tool-c は元 false でも公開へ）
        connections: [
          { connectionId: 1, allowedToolNames: ["tool-a", "tool-c"] },
        ],
      });

      expect(mcpRepository.createTools).toHaveBeenCalledWith(mockDb, [
        expect.objectContaining({ name: "tool-a", isAllowed: true }),
        expect.objectContaining({ name: "tool-b", isAllowed: false }),
        expect.objectContaining({ name: "tool-c", isAllowed: true }),
      ]);
    });

    test("元コネクタにツールが0件の場合は createTools を呼ばない", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1, tools: [] }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 400,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      expect(mcpRepository.createTools).not.toHaveBeenCalled();
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
      // 境界値テスト: VIRTUAL_SERVER_MAX_CONNECTIONS と一致する件数では通過すること
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "GitHub" }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
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

    test("コネクタが見つからない場合はエラーを投げる（書き込みI/Oは起きない）", async () => {
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue(
        [],
      );

      await expect(mcpService.createVirtualServer(baseInput)).rejects.toThrow(
        "コネクタ(id=1)が見つかりません",
      );
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("OAuthコネクタが含まれる場合も元コネクタの secretId を共有する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({
          id: 1,
          name: "Notion",
          transportType: "STREAMABLE_HTTP",
          command: null,
          url: "https://mcp.notion.com",
          authType: "OAUTH",
          secretId: 77,
        }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 500,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      // OAuth トークン更新が元コネクタ・仮想MCP配下の両方に伝播するよう、secretId を共有する
      expect(mcpRepository.createConnection).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: "Notion",
          authType: "OAUTH",
          secretId: 77,
        }),
      );
    });

    test("無効化されたコネクタが含まれる場合はエラーを投げる（書き込みI/Oは起きない）", async () => {
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "GitHub", isEnabled: false }),
      ]);

      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [{ connectionId: 1 }],
        }),
      ).rejects.toThrow("コネクタ「GitHub」は無効化されています");
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("コネクタが属するサーバーが無効化されている場合はエラーを投げる（書き込みI/Oは起きない）", async () => {
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        // 接続は有効でも、UIフィルタ後にサーバーが無効化された競合状態を再現
        buildSourceConnection({
          id: 1,
          name: "GitHub",
          isEnabled: true,
          server: { isEnabled: false, serverType: "OFFICIAL" },
        }),
      ]);

      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [{ connectionId: 1 }],
        }),
      ).rejects.toThrow(
        "コネクタ「GitHub」が属するサーバーは無効化されています",
      );
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("仮想MCP（CUSTOM）配下の接続を含む場合はエラーを投げる（書き込みI/Oは起きない）", async () => {
      // UI フィルタ後（または IPC を直接呼ぶ経路）で仮想MCP配下の接続が選ばれた場合の防御層
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({
          id: 1,
          name: "GitHub",
          // serverType === "CUSTOM" → 元サーバーが既に仮想MCP であることを示す
          server: { isEnabled: true, serverType: "CUSTOM" },
        }),
      ]);

      await expect(
        mcpService.createVirtualServer({
          ...baseInput,
          connections: [{ connectionId: 1 }],
        }),
      ).rejects.toThrow(
        "コネクタ「GitHub」は仮想MCPに含まれるため、新しい仮想MCPの構成要素にできません",
      );
      expect(mcpRepository.createServer).not.toHaveBeenCalled();
      expect(mcpRepository.createConnection).not.toHaveBeenCalled();
    });

    test("作成された仮想MCPサーバーは serverType=CUSTOM で永続化される", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      expect(mcpRepository.createServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ serverType: "CUSTOM" }),
      );
    });

    test("同一コネクタを複数追加した場合は接続slugにサフィックスを付与する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "GitHub" }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
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
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
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
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 12,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
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

    test("接続コネクタ名が日本語のみの場合は接続slugに乱数フォールバックを採用する", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 13,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1, name: "テスト用コネクタ" }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }, { connectionId: 1 }],
      });

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

    test("仮想MCP作成時に追加の tools/list 取得は呼ばれない（既存DBのMcpToolをコピーするため）", async () => {
      vi.mocked(mcpRepository.findServerByName).mockResolvedValue(null);
      vi.mocked(mcpRepository.findServerBySlug).mockResolvedValue(null);
      vi.mocked(mcpRepository.createServer).mockResolvedValue({
        id: 10,
      } as Awaited<ReturnType<typeof mcpRepository.createServer>>);
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        buildSourceConnection({ id: 1 }),
      ]);
      vi.mocked(mcpRepository.createConnection).mockResolvedValue({
        id: 100,
      } as Awaited<ReturnType<typeof mcpRepository.createConnection>>);

      await mcpService.createVirtualServer({
        ...baseInput,
        connections: [{ connectionId: 1 }],
      });

      expect(mcpProxyService.fetchToolsForConnection).not.toHaveBeenCalled();
    });
  });

  describe("getToolsForConnections", () => {
    test("選択中の各コネクタからツール情報（name/description/isAllowed）を取得する", async () => {
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        {
          id: 1,
          tools: [
            {
              name: "search",
              description: "検索する",
              inputSchema: "{}",
              isAllowed: true,
            },
            {
              name: "fetch",
              description: "取得する",
              inputSchema: "{}",
              isAllowed: false,
            },
          ],
        } as ConnectionWithTools,
        {
          id: 2,
          tools: [
            {
              name: "post",
              description: "投稿",
              inputSchema: "{}",
              isAllowed: true,
            },
          ],
        } as ConnectionWithTools,
      ]);

      const result = await mcpService.getToolsForConnections({
        connectionIds: [1, 2],
      });

      expect(result).toStrictEqual({
        items: [
          {
            connectionId: 1,
            tools: [
              { name: "search", description: "検索する", isAllowed: true },
              { name: "fetch", description: "取得する", isAllowed: false },
            ],
          },
          {
            connectionId: 2,
            tools: [{ name: "post", description: "投稿", isAllowed: true }],
          },
        ],
      });
    });

    test("入力 connectionIds が空の場合は空 items を返す（DBアクセスなし）", async () => {
      const result = await mcpService.getToolsForConnections({
        connectionIds: [],
      });

      expect(result).toStrictEqual({ items: [] });
      expect(
        mcpRepository.findConnectionsByIdsWithTools,
      ).not.toHaveBeenCalled();
    });

    test("存在しないコネクタIDは結果から除外される（入力順は保たれる）", async () => {
      vi.mocked(mcpRepository.findConnectionsByIdsWithTools).mockResolvedValue([
        {
          id: 2,
          tools: [],
        } as unknown as ConnectionWithTools,
      ]);

      const result = await mcpService.getToolsForConnections({
        connectionIds: [1, 2],
      });

      expect(result).toStrictEqual({
        items: [{ connectionId: 2, tools: [] }],
      });
    });
  });

  describe("getAllServers", () => {
    test("全サーバーを取得する（接続なし）", async () => {
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

    test("credentials / secretId は IPC 戻り値に含めない（内部キーは renderer に公開しない）", async () => {
      const mockServers = [
        {
          id: 1,
          name: "Server A",
          connections: [
            {
              id: 10,
              secretId: 99,
              _count: { tools: 0 },
            },
          ],
        },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );

      const result = await mcpService.getAllServers();

      expect(result[0]?.connections[0]).not.toHaveProperty("secretId");
      expect(result[0]?.connections[0]).not.toHaveProperty("credentials");
      // 復号はそもそも呼ばれない（secret を include していないため）
      expect(decryptCredentials).not.toHaveBeenCalled();
    });

    test("Prisma の _count.tools を toolCount に平坦化する（_count は除去される）", async () => {
      const mockServers = [
        {
          id: 1,
          name: "Server A",
          connections: [
            { id: 10, _count: { tools: 3 } },
            { id: 11, _count: { tools: 0 } },
          ],
        },
      ];
      vi.mocked(mcpRepository.findAllWithConnections).mockResolvedValue(
        mockServers as unknown as Awaited<
          ReturnType<typeof mcpRepository.findAllWithConnections>
        >,
      );

      const result = await mcpService.getAllServers();

      expect(result[0]?.connections[0]?.toolCount).toBe(3);
      expect(result[0]?.connections[1]?.toolCount).toBe(0);
      // _count は IPC 通信用の整形時に除去される
      expect(result[0]?.connections[0]).not.toHaveProperty("_count");
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
    test("サーバーを削除する（参照カウント0の secret も後始末する）", async () => {
      vi.mocked(mcpRepository.deleteServer).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.deleteServer>>,
      );
      // findSecretIdsByServerId は distinct 済みの secretId を返す（repository 側で重複除去）
      vi.mocked(mcpRepository.findSecretIdsByServerId).mockResolvedValue([
        11, 12,
      ]);

      await mcpService.deleteServer(1);

      expect(mcpRepository.deleteServer).toHaveBeenCalledWith(mockDb, 1);
      // 各 secretId について参照カウント判定が呼ばれる
      expect(mcpRepository.deleteSecretIfOrphaned).toHaveBeenCalledTimes(2);
      expect(mcpRepository.deleteSecretIfOrphaned).toHaveBeenCalledWith(
        mockDb,
        11,
      );
      expect(mcpRepository.deleteSecretIfOrphaned).toHaveBeenCalledWith(
        mockDb,
        12,
      );
    });

    test("仮想MCPと共有された secret は他に参照が残るため削除されない（参照カウント運用）", async () => {
      // deleteSecretIfOrphaned は内部で count() してまだ参照があれば DELETE しない実装。
      // ここではサービス層が secretId ごとに deleteSecretIfOrphaned を呼ぶことだけを検証する。
      vi.mocked(mcpRepository.deleteServer).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.deleteServer>>,
      );
      vi.mocked(mcpRepository.findSecretIdsByServerId).mockResolvedValue([55]);

      await mcpService.deleteServer(2);

      expect(mcpRepository.deleteSecretIfOrphaned).toHaveBeenCalledWith(
        mockDb,
        55,
      );
    });

    test("配下接続が0件のサーバーを削除しても deleteSecretIfOrphaned は呼ばれない", async () => {
      vi.mocked(mcpRepository.deleteServer).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpRepository.deleteServer>>,
      );
      vi.mocked(mcpRepository.findSecretIdsByServerId).mockResolvedValue([]);

      await mcpService.deleteServer(3);

      expect(mcpRepository.deleteSecretIfOrphaned).not.toHaveBeenCalled();
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

  describe("updateIsPiiMaskingEnabled", () => {
    test("PIIマスキングフラグを repository へ委譲する（無効化）", async () => {
      const mockUpdated = { id: 1, isPiiMaskingEnabled: false };
      vi.mocked(mcpRepository.updateIsPiiMaskingEnabled).mockResolvedValue(
        mockUpdated as Awaited<
          ReturnType<typeof mcpRepository.updateIsPiiMaskingEnabled>
        >,
      );

      const result = await mcpService.updateIsPiiMaskingEnabled(1, false);

      expect(result).toStrictEqual(mockUpdated);
      expect(mcpRepository.updateIsPiiMaskingEnabled).toHaveBeenCalledWith(
        mockDb,
        1,
        false,
      );
    });

    test("PIIマスキングフラグを repository へ委譲する（有効化）", async () => {
      const mockUpdated = { id: 5, isPiiMaskingEnabled: true };
      vi.mocked(mcpRepository.updateIsPiiMaskingEnabled).mockResolvedValue(
        mockUpdated as Awaited<
          ReturnType<typeof mcpRepository.updateIsPiiMaskingEnabled>
        >,
      );

      const result = await mcpService.updateIsPiiMaskingEnabled(5, true);

      expect(result).toStrictEqual(mockUpdated);
      expect(mcpRepository.updateIsPiiMaskingEnabled).toHaveBeenCalledWith(
        mockDb,
        5,
        true,
      );
    });
  });
});
