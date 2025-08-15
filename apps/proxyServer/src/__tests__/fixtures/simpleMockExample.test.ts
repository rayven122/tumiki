import { describe, test, expect } from "vitest";
import { createSimpleMockServer } from "./mockMcpServer.js";
import { testUtils } from "../setup.js";

type JsonRpcResponse = {
  jsonrpc: "2.0";
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: unknown;
};

describe("createSimpleMockServer", () => {
  test("初期化メソッドの正常レスポンス", async () => {
    // レスポンスマップを定義
    const responses: Record<string, JsonRpcResponse> = {
      initialize: {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          serverInfo: {
            name: "simple-mock-server",
            version: "1.0.0",
          },
        },
        id: 1,
      },
      "tools/list": {
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "simple-tool",
              description: "A simple test tool",
              inputSchema: {
                type: "object",
                properties: {
                  input: { type: "string" },
                },
              },
            },
          ],
        },
        id: 2,
      },
    };

    const mockServer = createSimpleMockServer(responses);

    // initialize リクエストのテスト
    const initRequest = testUtils.createMockJsonRpcRequest("initialize");
    const initResponse = await mockServer.handleRequest(initRequest);

    expect(initResponse).toStrictEqual(responses.initialize);

    // tools/list リクエストのテスト
    const toolsRequest = testUtils.createMockJsonRpcRequest("tools/list");
    const toolsResponse = await mockServer.handleRequest(toolsRequest);

    expect(toolsResponse).toStrictEqual(responses["tools/list"]);
  });

  test("未定義メソッドでMethod not foundエラー", async () => {
    const mockServer = createSimpleMockServer({});

    const request = testUtils.createMockJsonRpcRequest("unknown-method");
    const response = await mockServer.handleRequest(request);

    expect(response).toStrictEqual({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Method not found" },
      id: 1,
    });
  });

  test("接続状態とセッション管理", () => {
    const mockServer = createSimpleMockServer({});

    expect(mockServer.isConnected()).toBe(true);
    expect(mockServer.getSessionId()).toBe("test-session-123");

    // リセット機能の存在確認と実行
    expect(typeof mockServer.reset).toBe("function");
    expect(() => mockServer.reset()).not.toThrow();
  });
});
