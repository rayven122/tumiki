/**
 * MCPハンドラーの CE版（Community Edition）固有テスト
 *
 * EEモジュールのdynamic importが失敗するケースをテストするため、
 * 独立したテストファイルで実行する必要がある。
 * （モジュールレベルのキャッシュが共有されるため、同一ファイル内では
 *   EEモジュールの成功/失敗を切り替えることができない）
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
  mockStreamableHTTPServerTransport,
  mockCreateReAuthResponse,
  mockGetExecutionContext,
  mockGetInternalToolsForDynamicSearch,
  mockToReqRes,
  mockToFetchResponse,
  mockHandleError,
  mockToError,
} = vi.hoisted(() => ({
  mockGetAllowedTools: vi.fn(),
  mockExecuteTool: vi.fn(),
  mockIsMetaTool: vi.fn(),
  mockIsReAuthRequiredError: vi.fn(),
  mockServerConstructor: vi.fn(),
  mockStreamableHTTPServerTransport: vi.fn(),
  mockCreateReAuthResponse: vi.fn(),
  mockGetExecutionContext: vi.fn(),
  mockGetInternalToolsForDynamicSearch: vi.fn(),
  mockToReqRes: vi.fn(),
  mockToFetchResponse: vi.fn(),
  mockHandleError: vi.fn(),
  mockToError: vi.fn(),
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
  StreamableHTTPServerTransport: mockStreamableHTTPServerTransport,
}));

vi.mock("fetch-to-node", () => ({
  toReqRes: mockToReqRes,
  toFetchResponse: mockToFetchResponse,
}));

vi.mock("../../services/toolExecutor.js", () => ({
  getAllowedTools: mockGetAllowedTools,
  executeTool: mockExecuteTool,
  getInternalToolsForDynamicSearch: mockGetInternalToolsForDynamicSearch,
}));

// CE版: EEモジュールのdynamic importが失敗するようにモック
vi.mock("../../services/dynamicSearch/index.ee.js", () => {
  throw new Error("Cannot find module (CE version)");
});

vi.mock("../../libs/error/index.js", () => ({
  handleError: mockHandleError,
  toError: mockToError,
  isReAuthRequiredError: mockIsReAuthRequiredError,
  createReAuthResponse: mockCreateReAuthResponse,
}));

vi.mock("../../middleware/requestLogging/context.js", () => ({
  getExecutionContext: mockGetExecutionContext,
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

import { mcpHandler } from "../mcpHandler.js";

describe("mcpHandler（CE版）", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    capturedHandlers.clear();

    mockServerConstructor.mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: (
        schema: { method: string },
        handler: HandlerCallback,
      ) => {
        capturedHandlers.set(schema.method, handler);
      },
    }));

    mockStreamableHTTPServerTransport.mockImplementation(() => ({
      handleRequest: vi.fn().mockResolvedValue(undefined),
    }));

    mockToReqRes.mockReturnValue({
      req: {},
      res: { statusCode: 200, setHeader: vi.fn(), end: vi.fn() },
    });
    mockToFetchResponse.mockImplementation((res: { statusCode?: number }) =>
      Promise.resolve(
        new Response(JSON.stringify({ result: "success" }), {
          status: res.statusCode ?? 200,
        }),
      ),
    );

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
    mockGetExecutionContext.mockReturnValue(null);
    mockGetInternalToolsForDynamicSearch.mockResolvedValue([]);
    mockHandleError.mockImplementation(
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
    );
    mockToError.mockImplementation((e: unknown) =>
      e instanceof Error ? e : new Error(String(e)),
    );

    app = new Hono<HonoEnv>();

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

  test("CE版でメタツールを呼び出した場合はDynamic Search利用不可エラーを投げる", async () => {
    mockIsMetaTool.mockReturnValue(true);

    await triggerRequest();

    const callHandler = capturedHandlers.get("tools/call");
    expect(callHandler).toBeDefined();

    await expect(
      callHandler!({
        params: { name: "search_tools", arguments: { query: "test" } },
      }) as Promise<unknown>,
    ).rejects.toThrow("Dynamic Search is not available in Community Edition");
  });
});
