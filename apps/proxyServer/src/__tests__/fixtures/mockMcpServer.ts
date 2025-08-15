import { vi } from "vitest";

interface MockServer {
  connect: ReturnType<typeof vi.fn>;
  disconnect?: ReturnType<typeof vi.fn>;
}

interface JsonRpcRequest {
  method: string;
  id?: unknown;
}

interface MockResponse {
  json: (data: unknown) => void;
}

export class MockMCPServer {
  public server: MockServer;
  private connected = false;
  private sessionId?: string;

  constructor() {
    this.server = {
      connect: vi.fn(async (transport: unknown) => {
        this.connected = true;
        const transportObj = transport as Record<string, unknown>;

        if (
          "sessionId" in transportObj &&
          typeof transportObj.sessionId === "string"
        ) {
          this.sessionId = transportObj.sessionId;
        }

        if (transportObj && "handleRequest" in transportObj) {
          const streamableTransport = transportObj as {
            handleRequest: (
              request: unknown,
              response: unknown,
              body: unknown,
            ) => Promise<void>;
          };

          const originalHandleRequest =
            streamableTransport.handleRequest.bind(streamableTransport);

          (streamableTransport as Record<string, unknown>).handleRequest =
            vi.fn(
              async (_request: unknown, response: unknown, body: unknown) => {
                if (body && typeof body === "object" && "method" in body) {
                  const jsonRpcRequest = body as JsonRpcRequest;
                  const res = response as MockResponse;

                  if (jsonRpcRequest.method === "initialize") {
                    res.json({
                      jsonrpc: "2.0",
                      result: {
                        protocolVersion: "2024-11-05",
                        capabilities: {},
                        serverInfo: {
                          name: "mock-server",
                          version: "1.0.0",
                        },
                      },
                      id: jsonRpcRequest.id,
                    });
                    return;
                  }

                  if (jsonRpcRequest.method === "tools/list") {
                    res.json({
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
                      id: jsonRpcRequest.id,
                    });
                    return;
                  }

                  if (jsonRpcRequest.method === "tools/call") {
                    res.json({
                      jsonrpc: "2.0",
                      result: {
                        content: [
                          {
                            type: "text",
                            text: "Tool executed successfully",
                          },
                        ],
                      },
                      id: jsonRpcRequest.id,
                    });
                    return;
                  }
                }

                return originalHandleRequest(_request, response, body);
              },
            );
        }

        if (transportObj && "handlePostMessage" in transportObj) {
          const sseTransport = transportObj as {
            handlePostMessage: (
              request: unknown,
              response: unknown,
              body: unknown,
            ) => Promise<void>;
          };

          const originalHandlePostMessage =
            sseTransport.handlePostMessage.bind(sseTransport);

          (sseTransport as Record<string, unknown>).handlePostMessage = vi.fn(
            async (_request: unknown, response: unknown, body: unknown) => {
              if (body && typeof body === "object" && "method" in body) {
                const jsonRpcRequest = body as JsonRpcRequest;
                const res = response as MockResponse;

                if (jsonRpcRequest.method === "initialize") {
                  res.json({
                    jsonrpc: "2.0",
                    result: {
                      protocolVersion: "2024-11-05",
                      capabilities: {},
                      serverInfo: {
                        name: "mock-server",
                        version: "1.0.0",
                      },
                    },
                    id: jsonRpcRequest.id,
                  });
                  return;
                }
              }

              return originalHandlePostMessage(_request, response, body);
            },
          );
        }
      }),

      disconnect: vi.fn(async () => {
        this.connected = false;
        this.sessionId = undefined;
      }),
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  reset(): void {
    this.connected = false;
    this.sessionId = undefined;
    vi.clearAllMocks();
  }
}

export const createMockServer = (): MockMCPServer => {
  return new MockMCPServer();
};
