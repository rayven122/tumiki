type JsonRpcRequest = {
  method: string;
  id?: unknown;
  params?: unknown;
};

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

type MockResponse = {
  json: (data: unknown) => void;
};

type MockMethodHandler = (request: JsonRpcRequest) => JsonRpcResponse;

type MockServerOptions = {
  sessionId?: string;
  connected?: boolean;
  customHandlers?: Record<string, MockMethodHandler>;
};

// シンプルなファクトリー関数パターン
export const createSimpleMockServer = (
  responses: Record<string, JsonRpcResponse>,
) => {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    handleRequest: vi.fn(async (request: JsonRpcRequest) => {
      return (
        responses[request.method] || {
          jsonrpc: "2.0" as const,
          error: { code: -32601, message: "Method not found" },
          id: request.id,
        }
      );
    }),
    isConnected: vi.fn().mockReturnValue(true),
    getSessionId: vi.fn().mockReturnValue("test-session-123"),
    reset: vi.fn(() => {
      vi.clearAllMocks();
    }),
  };
};

// より高度なモックサーバー
export const createAdvancedMockServer = (options: MockServerOptions = {}) => {
  let connected = options.connected ?? false;
  let sessionId = options.sessionId;

  const defaultHandlers: Record<string, MockMethodHandler> = {
    initialize: (request) => ({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        serverInfo: {
          name: "mock-server",
          version: "1.0.0",
        },
      },
      id: request.id,
    }),
    "tools/list": (request) => ({
      jsonrpc: "2.0",
      result: {
        tools: [
          {
            name: "test-tool",
            description: "A test tool",
            inputSchema: {
              type: "object",
              properties: {
                input: { type: "string" },
              },
            },
          },
        ],
      },
      id: request.id,
    }),
    "tools/call": (request) => ({
      jsonrpc: "2.0",
      result: {
        content: [
          {
            type: "text",
            text: "Tool executed successfully",
          },
        ],
      },
      id: request.id,
    }),
    ...options.customHandlers,
  };

  return {
    connect: vi.fn(async (transport: unknown) => {
      connected = true;
      const transportObj = transport as Record<string, unknown>;

      if (
        "sessionId" in transportObj &&
        typeof transportObj.sessionId === "string"
      ) {
        sessionId = transportObj.sessionId;
      }

      // Streamable transport のモック
      if (transportObj && "handleRequest" in transportObj) {
        const streamableTransport = transportObj as {
          handleRequest: (
            request: unknown,
            response: unknown,
            body: unknown,
          ) => Promise<void>;
        };

        (streamableTransport as Record<string, unknown>).handleRequest = vi.fn(
          async (_request: unknown, response: unknown, body: unknown) => {
            if (body && typeof body === "object" && "method" in body) {
              const jsonRpcRequest = body as JsonRpcRequest;
              const res = response as MockResponse;
              const handler = defaultHandlers[jsonRpcRequest.method];

              if (handler) {
                res.json(handler(jsonRpcRequest));
                return;
              }
            }

            // デフォルトエラーレスポンス
            (response as MockResponse).json({
              jsonrpc: "2.0",
              error: { code: -32601, message: "Method not found" },
              id: (body as JsonRpcRequest)?.id,
            });
          },
        );
      }

      // SSE transport のモック
      if (transportObj && "handlePostMessage" in transportObj) {
        const sseTransport = transportObj as {
          handlePostMessage: (
            request: unknown,
            response: unknown,
            body: unknown,
          ) => Promise<void>;
        };

        (sseTransport as Record<string, unknown>).handlePostMessage = vi.fn(
          async (_request: unknown, response: unknown, body: unknown) => {
            if (body && typeof body === "object" && "method" in body) {
              const jsonRpcRequest = body as JsonRpcRequest;
              const res = response as MockResponse;
              const handler = defaultHandlers[jsonRpcRequest.method];

              if (handler) {
                res.json(handler(jsonRpcRequest));
                return;
              }
            }
          },
        );
      }
    }),

    disconnect: vi.fn(async () => {
      connected = false;
      sessionId = undefined;
    }),

    isConnected: vi.fn(() => connected),
    getSessionId: vi.fn(() => sessionId),

    reset: vi.fn(() => {
      connected = false;
      sessionId = undefined;
      vi.clearAllMocks();
    }),
  };
};

// 後方互換性のためのレガシーMockMCPServerクラス
export class MockMCPServer {
  public server: ReturnType<typeof createAdvancedMockServer>;

  constructor(options?: MockServerOptions) {
    this.server = createAdvancedMockServer(options);
  }

  isConnected(): boolean {
    return this.server.isConnected();
  }

  getSessionId(): string | undefined {
    return this.server.getSessionId();
  }

  reset(): void {
    this.server.reset();
  }
}

// 後方互換性のためのcreateMockServer
export const createMockServer = (
  options?: MockServerOptions,
): MockMCPServer => {
  return new MockMCPServer(options);
};
