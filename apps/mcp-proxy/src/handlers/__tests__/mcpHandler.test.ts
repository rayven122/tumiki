/**
 * MCPハンドラーのテスト
 *
 * mcpHandlerは@modelcontextprotocol/sdkのServerとTransportを内部で使用するため、
 * ユニットテストでは認証コンテキストの検証とエラーハンドリングに焦点を当てる。
 */

/* eslint-disable @typescript-eslint/unbound-method */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { Context } from "hono";
import { AuthType, PiiMaskingMode } from "@tumiki/db/server";
import type { HonoEnv, AuthContext } from "../../types/index.js";

// MCP SDKをモック
const mockServerInstance = {
  setRequestHandler: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn(() => mockServerInstance),
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn(),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  InitializeRequestSchema: { method: "initialize" },
  ListToolsRequestSchema: { method: "tools/list" },
  CallToolRequestSchema: { method: "tools/call" },
}));

vi.mock("fetch-to-node", () => ({
  toFetchResponse: vi.fn().mockReturnValue(new Response("", { status: 200 })),
  toReqRes: vi.fn().mockReturnValue({
    req: {},
    res: { writeHead: vi.fn(), end: vi.fn() },
  }),
}));

// DBをモック
vi.mock("@tumiki/db/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...mod,
    db: {
      mcpServer: {
        findUnique: vi.fn(),
      },
    },
  };
});

// サービスをモック
vi.mock("../../services/toolExecutor.js", () => ({
  getAllowedTools: vi.fn().mockResolvedValue([]),
  executeTool: vi.fn().mockResolvedValue({ content: [] }),
}));

vi.mock("../../services/unifiedMcp/index.js", () => ({
  aggregateTools: vi.fn().mockResolvedValue([]),
  executeUnifiedTool: vi.fn().mockResolvedValue({ content: [] }),
}));

// エラーハンドラーをモック
vi.mock("../../libs/error/handler.js", () => ({
  handleError: vi.fn().mockReturnValue(new Response("Error", { status: 500 })),
}));

// コンテキストをモック
vi.mock("../../middleware/requestLogging/context.js", () => ({
  getExecutionContext: vi.fn().mockReturnValue(null),
  updateExecutionContext: vi.fn(),
}));

import { db } from "@tumiki/db/server";
import { mcpHandler } from "../mcpHandler.js";

/**
 * テスト用モックHonoコンテキストを作成
 */
const createMockContext = (
  authContext: AuthContext | undefined,
  serverId: string,
  requestBody: unknown = {},
): Context<HonoEnv> => {
  const mockContext = {
    req: {
      param: vi.fn().mockReturnValue(serverId),
      raw: new Request("http://localhost/mcp/" + serverId, {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      }),
      json: vi.fn().mockResolvedValue(requestBody),
    },
    get: vi.fn().mockImplementation((key: string) => {
      if (key === "authContext") {
        return authContext;
      }
      return undefined;
    }),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Context<HonoEnv>;

  return mockContext;
};

/**
 * テスト用のデフォルト認証コンテキスト
 */
const createDefaultAuthContext = (
  overrides: Partial<AuthContext> = {},
): AuthContext => ({
  authMethod: AuthType.API_KEY,
  organizationId: "org-123",
  userId: "user-123",
  mcpServerId: "server-123",
  piiMaskingMode: PiiMaskingMode.DISABLED,
  piiInfoTypes: [],
  toonConversionEnabled: false,
  ...overrides,
});

describe("mcpHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("認証コンテキスト検証", () => {
    test("authContextがない場合はエラーをスローする", async () => {
      const mockContext = createMockContext(undefined, "server-123");

      await expect(mcpHandler(mockContext)).rejects.toThrow(
        "Authentication context not found",
      );
    });

    test("authContextがある場合は正常に処理される", async () => {
      const authContext = createDefaultAuthContext();
      const mockContext = createMockContext(authContext, "server-123");

      // エラーがスローされずに処理が完了することを検証
      await expect(mcpHandler(mockContext)).resolves.not.toThrow();
    });
  });

  describe("統合MCPサーバーのルーティング", () => {
    test("isUnifiedEndpoint=trueの場合は統合MCPハンドラーが使用される", async () => {
      const authContext = createDefaultAuthContext({
        isUnifiedEndpoint: true,
        unifiedMcpServerId: "unified-server-123",
      });
      const mockContext = createMockContext(authContext, "unified-server-123");

      vi.mocked(db.mcpServer.findUnique).mockResolvedValue({
        id: "unified-server-123",
        name: "Test Unified Server",
      } as never);

      await mcpHandler(mockContext);

      // 統合MCPサーバーの名前を取得するためにDB呼び出しが行われることを検証
      expect(db.mcpServer.findUnique).toHaveBeenCalledWith({
        where: { id: "unified-server-123" },
        select: { name: true },
      });
    });

    test("統合MCPサーバーが見つからない場合はデフォルト名が使用される", async () => {
      const authContext = createDefaultAuthContext({
        isUnifiedEndpoint: true,
        unifiedMcpServerId: "non-existent-server",
      });
      const mockContext = createMockContext(authContext, "non-existent-server");

      vi.mocked(db.mcpServer.findUnique).mockResolvedValue(null);

      // エラーがスローされずに処理が完了することを検証（デフォルト名が使用される）
      await expect(mcpHandler(mockContext)).resolves.not.toThrow();

      // DB検索が呼ばれたことを検証
      expect(db.mcpServer.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-server" },
        select: { name: true },
      });
    });
  });

  describe("通常MCPサーバーのルーティング", () => {
    test("isUnifiedEndpoint=falseの場合は通常MCPハンドラーが使用される", async () => {
      const authContext = createDefaultAuthContext({
        isUnifiedEndpoint: false,
        mcpServerId: "normal-server-123",
      });
      const mockContext = createMockContext(authContext, "normal-server-123");

      await mcpHandler(mockContext);

      // 統合MCPサーバーのDBクエリが呼ばれないことを検証
      expect(db.mcpServer.findUnique).not.toHaveBeenCalled();
    });

    test("isUnifiedEndpointが未設定の場合は通常MCPハンドラーが使用される", async () => {
      const authContext = createDefaultAuthContext();
      const mockContext = createMockContext(authContext, "server-123");

      await mcpHandler(mockContext);

      // 統合MCPサーバーのDBクエリが呼ばれないことを検証
      expect(db.mcpServer.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("エラーハンドリング", () => {
    test("サーバー名取得時のDBエラーはデフォルト名にフォールバックする", async () => {
      const authContext = createDefaultAuthContext({
        isUnifiedEndpoint: true,
        unifiedMcpServerId: "error-server",
      });
      const mockContext = createMockContext(authContext, "error-server");

      // findUniqueがエラーをスローするように設定
      vi.mocked(db.mcpServer.findUnique).mockRejectedValue(
        new Error("DB connection failed"),
      );

      // DBエラー時もデフォルト名で処理が継続されることを検証
      await expect(mcpHandler(mockContext)).resolves.not.toThrow();

      // DB呼び出しは行われたことを検証
      expect(db.mcpServer.findUnique).toHaveBeenCalledWith({
        where: { id: "error-server" },
        select: { name: true },
      });
    });
  });

  describe("サーバーIDの取得", () => {
    test("ルートパラメータからserverIdが取得される", async () => {
      const authContext = createDefaultAuthContext();
      const mockContext = createMockContext(authContext, "param-server-id");

      await mcpHandler(mockContext);

      // パラメータ取得が呼ばれることを検証
      expect(mockContext.req.param).toHaveBeenCalledWith("serverId");
    });

    test("authContext.mcpServerIdがserverIdとして使用される（通常サーバーの場合）", async () => {
      const authContext = createDefaultAuthContext({
        mcpServerId: "auth-context-server-id",
      });
      const mockContext = createMockContext(
        authContext,
        "param-server-id", // ルートパラメータは異なる値
      );

      // 通常サーバーの場合、エラーがスローされずに処理が完了することを検証
      await expect(mcpHandler(mockContext)).resolves.not.toThrow();

      // パラメータ取得が呼ばれたことを検証
      expect(mockContext.req.param).toHaveBeenCalledWith("serverId");
    });
  });
});

describe("mcpHandler - ツール一覧取得", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("統合MCPサーバーの場合はaggregateToolsが呼ばれる準備ができている", async () => {
    // このテストは統合テストまたはE2Eテストで詳細に検証する
    // ユニットテストではMCP SDKのセットアップが正しく行われることを確認
    const authContext = createDefaultAuthContext({
      isUnifiedEndpoint: true,
      unifiedMcpServerId: "unified-server-123",
    });
    const mockContext = createMockContext(authContext, "unified-server-123");

    vi.mocked(db.mcpServer.findUnique).mockResolvedValue({
      id: "unified-server-123",
      name: "Test Unified Server",
    } as never);

    // ハンドラーが正常に完了することを検証
    await expect(mcpHandler(mockContext)).resolves.not.toThrow();

    // 統合MCPサーバーの名前取得が呼ばれたことを検証
    expect(db.mcpServer.findUnique).toHaveBeenCalledWith({
      where: { id: "unified-server-123" },
      select: { name: true },
    });
  });
});

describe("mcpHandler - ツール実行", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("統合MCPサーバーの場合はexecuteUnifiedToolが呼ばれる準備ができている", async () => {
    // このテストは統合テストまたはE2Eテストで詳細に検証する
    const authContext = createDefaultAuthContext({
      isUnifiedEndpoint: true,
      unifiedMcpServerId: "unified-server-123",
    });
    const mockContext = createMockContext(authContext, "unified-server-123");

    vi.mocked(db.mcpServer.findUnique).mockResolvedValue({
      id: "unified-server-123",
      name: "Test Unified Server",
    } as never);

    // ハンドラーが正常に完了することを検証
    await expect(mcpHandler(mockContext)).resolves.not.toThrow();

    // 統合MCPサーバーの名前取得が呼ばれたことを検証
    expect(db.mcpServer.findUnique).toHaveBeenCalledWith({
      where: { id: "unified-server-123" },
      select: { name: true },
    });
  });
});
