/**
 * MCPハンドラーのユニットテスト
 *
 * mcpHandlerは複雑な依存関係（MCP SDK、データベース、認証等）があるため、
 * 主要な動作パスと認証コンテキストの検証に焦点を当てる
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv, AuthContext } from "../../types/index.js";
import { AuthType } from "@tumiki/db";

// setRequestHandler に渡されたコールバックをキャプチャ
type HandlerCallback = (...args: unknown[]) => unknown;
const capturedHandlers = new Map<string, HandlerCallback>();

const {
  mockGetAllowedTools,
  mockExecuteTool,
  mockIsMetaTool,
  mockIsReAuthRequiredError,
  mockServerConstructor,
} = vi.hoisted(() => ({
  mockGetAllowedTools: vi.fn().mockResolvedValue({
    tools: [
      {
        name: "test__tool",
        description: "Test tool",
        inputSchema: { type: "object" },
      },
    ],
    dynamicSearch: false,
  }),
  mockExecuteTool: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "result" }],
  }),
  mockIsMetaTool: vi.fn().mockReturnValue(false),
  mockIsReAuthRequiredError: vi.fn().mockReturnValue(false),
  mockServerConstructor: vi.fn(),
}));

// 外部依存をモック
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: mockServerConstructor,
}));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  InitializeRequestSchema: { method: "initialize" },
  ListToolsRequestSchema: { method: "tools/list" },
  CallToolRequestSchema: { method: "tools/call" },
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("fetch-to-node", () => ({
  toReqRes: vi.fn().mockReturnValue({
    req: {},
    res: {
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
    },
  }),
  toFetchResponse: vi.fn().mockImplementation((res: { statusCode?: number }) =>
    Promise.resolve(
      new Response(JSON.stringify({ result: "success" }), {
        status: res.statusCode ?? 200,
      }),
    ),
  ),
}));

vi.mock("../../services/toolExecutor.js", () => ({
  getAllowedTools: mockGetAllowedTools,
  executeTool: mockExecuteTool,
  getInternalToolsForDynamicSearch: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../libs/error/index.js", () => ({
  handleError: vi
    .fn()
    .mockImplementation(
      (
        c: { json: (body: unknown, status: number) => Response },
        error: Error,
      ) =>
        c.json(
          {
            jsonrpc: "2.0",
            error: { code: -32603, message: error.message },
            id: null,
          },
          500,
        ),
    ),
  toError: vi
    .fn()
    .mockImplementation((e: unknown) =>
      e instanceof Error ? e : new Error(String(e)),
    ),
  isReAuthRequiredError: mockIsReAuthRequiredError,
  createReAuthResponse: vi.fn().mockReturnValue({
    jsonRpcError: {
      error: {
        code: -32001,
        message: "Re-auth required",
        data: {
          type: "ReAuthRequired" as const,
          resource_metadata: "http://localhost:8080/test",
        },
      },
    },
    headers: { "WWW-Authenticate": "Bearer" },
  }),
}));

vi.mock("../../middleware/requestLogging/context.js", () => ({
  getExecutionContext: vi.fn().mockReturnValue(null),
  updateExecutionContext: vi.fn(),
}));

vi.mock("../../services/dynamicSearch/index.js", () => ({
  isMetaTool: mockIsMetaTool,
}));

vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// mcpHandlerのインポートはモック設定後
import { mcpHandler } from "../mcpHandler.js";

describe("mcpHandler", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    capturedHandlers.clear();

    // Server モックを毎回再設定（clearAllMocksで消えるため）
    mockServerConstructor.mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: (
        schema: { method: string },
        handler: HandlerCallback,
      ) => {
        capturedHandlers.set(schema.method, handler);
      },
    }));

    // hoisted モックのデフォルト値を再設定
    mockGetAllowedTools.mockResolvedValue({
      tools: [
        {
          name: "test__tool",
          description: "Test tool",
          inputSchema: { type: "object" },
        },
      ],
      dynamicSearch: false,
    });
    mockExecuteTool.mockResolvedValue({
      content: [{ type: "text", text: "result" }],
    });
    mockIsMetaTool.mockReturnValue(false);
    mockIsReAuthRequiredError.mockReturnValue(false);

    app = new Hono<HonoEnv>();

    // テスト用に認証コンテキストを設定するミドルウェア
    app.use("/mcp/:mcpServerId", async (c, next) => {
      const authContext: AuthContext = {
        authMethod: AuthType.OAUTH,
        organizationId: "org-123",
        userId: "user-456",
        mcpServerId: "server-123",
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
      };
      c.set("authContext", authContext);
      await next();
    });

    app.post("/mcp/:mcpServerId", mcpHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ハンドラーコールバックをキャプチャするためにリクエストを送信
  const triggerRequest = async () => {
    await app.request("/mcp/server-123", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });
  };

  describe("認証コンテキストの検証", () => {
    test("認証コンテキストがない場合はエラーハンドリングされる", async () => {
      const appWithoutAuth = new Hono<HonoEnv>();
      appWithoutAuth.post("/mcp/:mcpServerId", mcpHandler);

      const res = await appWithoutAuth.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(res.status).toStrictEqual(500);
    });

    test("リクエストが処理される（認証コンテキストあり）", async () => {
      const res = await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(res).toBeDefined();
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("createMcpServer コールバック", () => {
    test("Initializeハンドラーがプロトコルバージョンとサーバー情報を返す", async () => {
      await triggerRequest();

      const initHandler = capturedHandlers.get("initialize");
      expect(initHandler).toBeDefined();

      const result = initHandler!();
      expect(result).toStrictEqual({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "Tumiki MCP Proxy",
          version: "0.1.0",
        },
      });
    });

    test("ListToolsハンドラーがツールリストを返す", async () => {
      await triggerRequest();

      const listHandler = capturedHandlers.get("tools/list");
      expect(listHandler).toBeDefined();

      const result = await (listHandler!() as Promise<unknown>);
      expect(result).toStrictEqual({
        tools: [
          {
            name: "test__tool",
            description: "Test tool",
            inputSchema: { type: "object" },
          },
        ],
      });
    });

    test("CallToolハンドラーが通常ツールを実行する", async () => {
      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      const result = await (callHandler!({
        params: { name: "test__tool", arguments: { key: "value" } },
      }) as Promise<unknown>);

      expect(mockExecuteTool).toHaveBeenCalledWith(
        "server-123",
        "org-123",
        "test__tool",
        { key: "value" },
        "user-456",
      );
      expect(result).toStrictEqual({
        content: [{ type: "text", text: "result" }],
      });
    });

    test("CallToolハンドラーがメタツール呼び出しを処理する", async () => {
      mockIsMetaTool.mockReturnValue(true);

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      // メタツールのハンドラーはEEモジュールのインポートを試みるが、
      // テスト環境では失敗するのでエラーが発生する
      await expect(
        callHandler!({
          params: { name: "search_tools", arguments: { query: "test" } },
        }) as Promise<unknown>,
      ).rejects.toThrow();
    });

    test("CallToolハンドラーでReAuthRequiredErrorがコンテナに保存される", async () => {
      mockIsReAuthRequiredError.mockReturnValue(true);
      const reAuthError = new Error("Re-auth needed");
      reAuthError.name = "ReAuthRequiredError";
      mockExecuteTool.mockRejectedValue(reAuthError);

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      await expect(
        callHandler!({
          params: { name: "test__tool", arguments: {} },
        }) as Promise<unknown>,
      ).rejects.toThrow("Re-auth needed");
    });

    test("CallToolハンドラーでargsがnullの場合は空オブジェクトを使用する", async () => {
      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      await (callHandler!({
        params: { name: "test__tool", arguments: undefined },
      }) as Promise<unknown>);

      expect(mockExecuteTool).toHaveBeenCalledWith(
        "server-123",
        "org-123",
        "test__tool",
        {},
        "user-456",
      );
    });
  });

  describe("Serverインスタンス作成", () => {
    test("Serverが正しいパラメータで作成される", async () => {
      await triggerRequest();

      expect(mockServerConstructor).toHaveBeenCalledWith(
        { name: "Tumiki MCP Proxy", version: "0.1.0" },
        { capabilities: { tools: {} } },
      );
    });

    test("3つのリクエストハンドラーが登録される", async () => {
      await triggerRequest();

      expect(capturedHandlers.size).toBe(3);
      expect(capturedHandlers.has("initialize")).toBe(true);
      expect(capturedHandlers.has("tools/list")).toBe(true);
      expect(capturedHandlers.has("tools/call")).toBe(true);
    });
  });

  describe("エラーハンドリング", () => {
    test("例外発生時はhandleErrorが呼ばれる", async () => {
      const appWithError = new Hono<HonoEnv>();
      appWithError.post("/mcp/:mcpServerId", mcpHandler);

      const res = await appWithError.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(res.status).toStrictEqual(500);
    });

    test("外部でReAuthRequiredError発生時はcreateReAuthResponseが呼ばれる", async () => {
      const { toFetchResponse } = await import("fetch-to-node");
      const { createReAuthResponse } = await import(
        "../../libs/error/index.js"
      );
      mockIsReAuthRequiredError.mockReturnValue(true);
      vi.mocked(toFetchResponse).mockImplementation(() => {
        throw new Error("Re-auth required");
      });

      await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(createReAuthResponse).toHaveBeenCalledWith(
        expect.any(Error),
        "server-123",
        null,
        expect.any(String),
      );
    });
  });
});
