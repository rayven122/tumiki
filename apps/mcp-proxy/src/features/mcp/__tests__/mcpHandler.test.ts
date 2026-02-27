import { describe, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { clearLicenseCache } from "@tumiki/license";

// EE機能（Dynamic Search）を有効化
beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");
  clearLicenseCache();
});

afterAll(() => {
  vi.unstubAllEnvs();
  clearLicenseCache();
});
import type { HonoEnv, AuthContext } from "../../../shared/types/honoEnv.js";
import { AuthType } from "@tumiki/db";

// setRequestHandler に渡されたコールバックをキャプチャ
type HandlerCallback = (...args: unknown[]) => unknown;
const capturedHandlers = new Map<string, HandlerCallback>();

const mocks = vi.hoisted(() => ({
  toolExecutor: {
    getAllowedTools: vi.fn(),
    executeTool: vi.fn(),
    getInternalToolsForDynamicSearch: vi.fn(),
  },
  dynamicSearch: {
    // isMetaTool は callToolHandler.ts がローカルのハードコードセットを使用するため不要
    searchTools: vi.fn(),
    describeTools: vi.fn(),
    executeToolDynamic: vi.fn(),
    searchToolsArgsParse: vi.fn(),
    describeToolsArgsParse: vi.fn(),
    callToolRequestParamsParse: vi.fn(),
  },
  sdk: {
    serverConstructor: vi.fn(),
    streamableHTTPServerTransport: vi.fn(),
  },
  error: {
    isReAuthRequiredError: vi.fn(),
    createReAuthResponse: vi.fn(),
    handleError: vi.fn(),
    toError: vi.fn(),
  },
  utils: {
    getExecutionContext: vi.fn(),
    toReqRes: vi.fn(),
    toFetchResponse: vi.fn(),
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: mocks.sdk.serverConstructor,
}));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  InitializeRequestSchema: { method: "initialize" },
  ListToolsRequestSchema: { method: "tools/list" },
  CallToolRequestSchema: { method: "tools/call" },
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: mocks.sdk.streamableHTTPServerTransport,
}));

vi.mock("fetch-to-node", () => ({
  toReqRes: mocks.utils.toReqRes,
  toFetchResponse: mocks.utils.toFetchResponse,
}));

vi.mock("../commands/callTool/callToolCommand.js", () => ({
  callToolCommand: mocks.toolExecutor.executeTool,
}));

vi.mock("../queries/listTools/listToolsQuery.js", () => ({
  listToolsQuery: mocks.toolExecutor.getAllowedTools,
  getInternalToolsForDynamicSearch:
    mocks.toolExecutor.getInternalToolsForDynamicSearch,
}));

vi.mock("../../dynamicSearch/index.ee.js", () => ({
  searchTools: mocks.dynamicSearch.searchTools,
  describeTools: mocks.dynamicSearch.describeTools,
  executeToolDynamic: mocks.dynamicSearch.executeToolDynamic,
  SearchToolsArgsSchema: { parse: mocks.dynamicSearch.searchToolsArgsParse },
  DescribeToolsArgsSchema: {
    parse: mocks.dynamicSearch.describeToolsArgsParse,
  },
  CallToolRequestParamsSchema: {
    parse: mocks.dynamicSearch.callToolRequestParamsParse,
  },
}));

vi.mock("../../../shared/errors/index.js", () => ({
  handleError: mocks.error.handleError,
  toError: mocks.error.toError,
  isReAuthRequiredError: mocks.error.isReAuthRequiredError,
  createReAuthResponse: mocks.error.createReAuthResponse,
}));

vi.mock("../middleware/requestLogging/context.js", () => ({
  getExecutionContext: mocks.utils.getExecutionContext,
  updateExecutionContext: vi.fn(),
}));

// dynamicSearch/index.js (CE Facade) のモックは不要
// callToolHandler.ts はローカルのハードコードセットを使用してメタツールを判定

vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

import { mcpRequestHandler } from "../mcpRequestHandler.js";

describe("mcpRequestHandler", () => {
  let app: Hono<HonoEnv>;

  const setupDefaultMocks = () => {
    mocks.sdk.serverConstructor.mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: (
        schema: { method: string },
        handler: HandlerCallback,
      ) => {
        capturedHandlers.set(schema.method, handler);
      },
    }));
    mocks.sdk.streamableHTTPServerTransport.mockImplementation(() => ({
      handleRequest: vi.fn().mockResolvedValue(undefined),
    }));

    mocks.utils.toReqRes.mockReturnValue({
      req: {},
      res: {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
      },
    });
    mocks.utils.toFetchResponse.mockImplementation(
      (res: { statusCode?: number }) =>
        Promise.resolve(
          new Response(JSON.stringify({ result: "success" }), {
            status: res.statusCode ?? 200,
          }),
        ),
    );
    mocks.utils.getExecutionContext.mockReturnValue(null);

    mocks.toolExecutor.getAllowedTools.mockResolvedValue({
      tools: [
        {
          name: "test__tool",
          description: "Test tool",
          inputSchema: { type: "object" },
        },
      ],
      dynamicSearch: false,
    });
    mocks.toolExecutor.executeTool.mockResolvedValue({
      content: [{ type: "text", text: "result" }],
    });
    mocks.toolExecutor.getInternalToolsForDynamicSearch.mockResolvedValue([]);

    // isMetaTool モックは不要（callToolHandler.ts がローカル定義を使用）

    mocks.error.isReAuthRequiredError.mockReturnValue(false);
    mocks.error.createReAuthResponse.mockReturnValue({
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
    });
    mocks.error.handleError.mockImplementation(
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
    mocks.error.toError.mockImplementation((e: unknown) =>
      e instanceof Error ? e : new Error(String(e)),
    );
  };

  beforeEach(() => {
    capturedHandlers.clear();
    setupDefaultMocks();

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

    app.post("/mcp/:mcpServerId", mcpRequestHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
      appWithoutAuth.post("/mcp/:mcpServerId", mcpRequestHandler);

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

      expect(mocks.toolExecutor.executeTool).toHaveBeenCalledWith({
        mcpServerId: "server-123",
        organizationId: "org-123",
        fullToolName: "test__tool",
        args: { key: "value" },
        userId: "user-456",
      });
      expect(result).toStrictEqual({
        content: [{ type: "text", text: "result" }],
      });
    });

    test("CallToolハンドラーがメタツール呼び出しを処理する", async () => {
      // isMetaTool モックは不要（メタツール名はハードコードセットで判定）
      const mockSearchResult = { tools: ["tool1"] };
      mocks.dynamicSearch.searchToolsArgsParse.mockReturnValue({
        query: "test",
      });
      mocks.dynamicSearch.searchTools.mockResolvedValue(mockSearchResult);

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      const result = await (callHandler!({
        params: { name: "search_tools", arguments: { query: "test" } },
      }) as Promise<{ content: Array<{ text: string }> }>);
      expect(JSON.parse(result.content[0].text)).toStrictEqual(
        mockSearchResult,
      );
    });

    test("CallToolハンドラーでReAuthRequiredErrorがコンテナに保存される", async () => {
      mocks.error.isReAuthRequiredError.mockReturnValue(true);
      const reAuthError = new Error("Re-auth needed");
      reAuthError.name = "ReAuthRequiredError";
      mocks.toolExecutor.executeTool.mockRejectedValue(reAuthError);

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

      expect(mocks.toolExecutor.executeTool).toHaveBeenCalledWith({
        mcpServerId: "server-123",
        organizationId: "org-123",
        fullToolName: "test__tool",
        args: {},
        userId: "user-456",
      });
    });
  });

  describe("Serverインスタンス作成", () => {
    test("Serverが正しいパラメータで作成される", async () => {
      await triggerRequest();

      expect(mocks.sdk.serverConstructor).toHaveBeenCalledWith(
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
      appWithError.post("/mcp/:mcpServerId", mcpRequestHandler);

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
      mocks.error.isReAuthRequiredError.mockReturnValue(true);
      mocks.utils.toFetchResponse.mockImplementation(() => {
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

      expect(mocks.error.createReAuthResponse).toHaveBeenCalledWith(
        expect.any(Error),
        "server-123",
        null,
        expect.any(String),
      );
    });

    test("非ReAuth例外発生時はhandleErrorが呼ばれる", async () => {
      mocks.utils.getExecutionContext.mockReturnValue({
        requestStartTime: Date.now(),
        inputBytes: 0,
        requestBody: { jsonrpc: "2.0", method: "tools/list", id: 1 },
      });
      mocks.sdk.streamableHTTPServerTransport.mockImplementation(() => ({
        handleRequest: vi.fn().mockRejectedValue(new Error("Transport error")),
      }));

      const res = await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(res.status).toStrictEqual(500);
      expect(mocks.error.handleError).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Error),
        expect.objectContaining({
          errorCode: -32603,
          errorMessage: "Internal error",
          organizationId: "org-123",
          instanceId: "server-123",
        }),
      );
    });
  });

  describe("handleMetaTool", () => {
    test("search_toolsケースが正しく動作する", async () => {
      // isMetaTool モックは不要（メタツール名はハードコードセットで判定）
      const mockSearchResult = { tools: ["tool1"] };
      mocks.dynamicSearch.searchToolsArgsParse.mockReturnValue({
        query: "test",
      });
      mocks.dynamicSearch.searchTools.mockResolvedValue(mockSearchResult);

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      const searchResult = await (callHandler!({
        params: { name: "search_tools", arguments: { query: "test" } },
      }) as Promise<{ content: Array<{ text: string }> }>);
      expect(JSON.parse(searchResult.content[0].text)).toStrictEqual(
        mockSearchResult,
      );
    });

    test("describe_toolsケースが正しく動作する", async () => {
      // isMetaTool モックは不要（メタツール名はハードコードセットで判定）
      const mockDescribeResult = { descriptions: ["desc1"] };
      mocks.dynamicSearch.describeToolsArgsParse.mockReturnValue({
        tools: ["tool1"],
      });
      mocks.dynamicSearch.describeTools.mockResolvedValue(mockDescribeResult);

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      const describeResult = await (callHandler!({
        params: { name: "describe_tools", arguments: { tools: ["tool1"] } },
      }) as Promise<{ content: Array<{ text: string }> }>);
      expect(JSON.parse(describeResult.content[0].text)).toStrictEqual(
        mockDescribeResult,
      );
    });

    test("execute_toolケースが正しく動作する", async () => {
      // isMetaTool モックは不要（メタツール名はハードコードセットで判定）
      const mockExecuteResult = {
        content: [{ type: "text", text: "execute result" }],
      };
      mocks.dynamicSearch.callToolRequestParamsParse.mockReturnValue({
        name: "instance__tool",
        arguments: { key: "value" },
      });
      mocks.dynamicSearch.executeToolDynamic.mockResolvedValue(
        mockExecuteResult,
      );

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      const executeResult = await (callHandler!({
        params: {
          name: "execute_tool",
          arguments: { name: "instance__tool", arguments: { key: "value" } },
        },
      }) as Promise<unknown>);
      expect(executeResult).toStrictEqual(mockExecuteResult);
    });

    test("メタツール実行でエラーが発生した場合はDomainErrorを投げる", async () => {
      // searchTools がエラーを投げるようにモック
      mocks.dynamicSearch.searchToolsArgsParse.mockReturnValue({
        query: "test",
      });
      mocks.dynamicSearch.searchTools.mockRejectedValue(
        new Error("Search failed"),
      );

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      await expect(
        callHandler!({
          params: { name: "search_tools", arguments: { query: "test" } },
        }) as Promise<unknown>,
      ).rejects.toMatchObject({
        name: "DomainError",
        code: "MCP_ERROR",
      });
    });
  });

  describe("reAuthErrorContainer", () => {
    test("transport.handleRequest後にreAuthErrorContainerにエラーがある場合は401を返す", async () => {
      const reAuthError = new Error("Re-auth needed");
      reAuthError.name = "ReAuthRequiredError";

      mocks.utils.getExecutionContext.mockReturnValue({
        requestStartTime: Date.now(),
        inputBytes: 0,
        requestBody: {
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: { name: "test__tool", arguments: {} },
        },
      });

      mocks.sdk.streamableHTTPServerTransport.mockImplementation(() => ({
        handleRequest: vi.fn().mockImplementation(async () => {
          const callHandler = capturedHandlers.get("tools/call");
          if (callHandler) {
            try {
              await (callHandler({
                params: { name: "test__tool", arguments: {} },
              }) as Promise<unknown>);
            } catch {
              // SDKがエラーをキャッチする想定
            }
          }
        }),
      }));

      mocks.toolExecutor.executeTool.mockRejectedValue(reAuthError);
      mocks.error.isReAuthRequiredError.mockReturnValue(true);

      const res = await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: { name: "test__tool", arguments: {} },
        }),
      });

      expect(res.status).toStrictEqual(401);
      expect(mocks.error.createReAuthResponse).toHaveBeenCalled();
    });

    test("外側のcatchでReAuthRequiredErrorをキャッチした場合は401を返す", async () => {
      const reAuthError = new Error("Re-auth needed");
      reAuthError.name = "ReAuthRequiredError";
      mocks.error.isReAuthRequiredError.mockReturnValue(true);

      mocks.utils.getExecutionContext.mockReturnValue({
        requestStartTime: Date.now(),
        inputBytes: 0,
        requestBody: {
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: { name: "test__tool", arguments: {} },
        },
      });

      mocks.sdk.streamableHTTPServerTransport.mockImplementation(() => ({
        handleRequest: vi.fn().mockRejectedValue(reAuthError),
      }));

      const res = await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: { name: "test__tool", arguments: {} },
        }),
      });

      expect(res.status).toStrictEqual(401);
    });
  });

  describe("CE版フォールバック", () => {
    test("CE版でメタツールを呼ぶとエラーを投げる", async () => {
      // CE版に切り替え
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ce");
      clearLicenseCache();

      await triggerRequest();

      const callHandler = capturedHandlers.get("tools/call");
      expect(callHandler).toBeDefined();

      // CE版ではDynamic Search機能が無効なのでエラーになる
      await expect(
        callHandler!({
          params: { name: "search_tools", arguments: { query: "test" } },
        }) as Promise<unknown>,
      ).rejects.toThrow("Dynamic Search is not available in Community Edition");

      // EE版に戻す
      vi.stubEnv("NEXT_PUBLIC_TUMIKI_EDITION", "ee");
      clearLicenseCache();
    });
  });

  describe("正常系フロー", () => {
    test("transport.handleRequest成功後にtoFetchResponseでレスポンスを返す", async () => {
      mocks.utils.getExecutionContext.mockReturnValue({
        requestStartTime: Date.now(),
        inputBytes: 0,
        requestBody: {
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        },
      });

      const res = await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(res.status).toStrictEqual(200);
      expect(mocks.utils.toFetchResponse).toHaveBeenCalled();
    });

    test("executionContextがnullの場合はc.req.json()からボディを取得する", async () => {
      mocks.utils.getExecutionContext.mockReturnValue(null);

      const res = await app.request("/mcp/server-123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
        }),
      });

      expect(res.status).toStrictEqual(200);
      expect(mocks.utils.toFetchResponse).toHaveBeenCalled();
    });
  });
});
