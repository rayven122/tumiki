/**
 * E2Eテスト用モックMCPサーバー
 *
 * @modelcontextprotocol/sdkを使用してテスト用のMCPサーバーを起動
 * 統合MCPエンドポイントのE2Eテストで使用
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as http from "http";

/**
 * モックツール定義
 */
export type MockTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
};

/**
 * モックMCPサーバーの設定
 */
export type MockMcpServerConfig = {
  port: number;
  name: string;
  tools: MockTool[];
};

/**
 * 起動中のモックMCPサーバー
 */
export type RunningMockMcpServer = {
  port: number;
  name: string;
  url: string;
  stop: () => Promise<void>;
};

/**
 * モックMCPサーバーを作成・起動
 *
 * @param config - サーバー設定
 * @returns 起動中のサーバー情報と停止関数
 */
export const createMockMcpServer = async (
  config: MockMcpServerConfig,
): Promise<RunningMockMcpServer> => {
  const { port, name, tools } = config;

  // MCP Serverインスタンスを作成
  const mcpServer = new Server(
    {
      name,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Initialize handler
  mcpServer.setRequestHandler(InitializeRequestSchema, () => ({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: {
      name,
      version: "1.0.0",
    },
  }));

  // Tools list handler
  mcpServer.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map(
      (tool): Tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Tool["inputSchema"],
      }),
    ),
  }));

  // Tools call handler
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;
    const tool = tools.find((t) => t.name === toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return tool.handler(args ?? {});
  });

  // HTTPサーバーを作成
  const httpServer = http.createServer((req, res) => {
    // 非同期処理をvoidとして扱う
    void (async () => {
      // /mcpパスへのPOSTリクエストを処理
      if (req.method === "POST" && req.url === "/mcp") {
        try {
          // Streamable HTTP Transportを使用
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // ステートレスモード
            enableJsonResponse: true,
          });

          await mcpServer.connect(transport);

          // リクエストボディを読み取り
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(chunk as Uint8Array);
          }
          const body = JSON.parse(Buffer.concat(chunks).toString()) as unknown;

          // リクエストを処理
          await transport.handleRequest(req, res, body);
        } catch (error) {
          console.error(`Mock MCP Server ${name} error:`, error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32603,
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
            }),
          );
        }
      } else {
        // 404 Not Found
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    })();
  });

  // サーバーを起動
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, "127.0.0.1", () => {
      console.log(`Mock MCP Server "${name}" listening on port ${port}`);
      resolve();
    });
    httpServer.on("error", reject);
  });

  const url = `http://127.0.0.1:${port}/mcp`;

  return {
    port,
    name,
    url,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`Mock MCP Server "${name}" stopped`);
            resolve();
          }
        });
      });
    },
  };
};

/**
 * テスト用のechoツール
 */
export const echoTool: MockTool = {
  name: "echo",
  description: "Echoes the input message",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to echo",
      },
    },
    required: ["message"],
  },
  handler: async (args) => ({
    content: [
      {
        type: "text",
        text: `Echo: ${args.message as string}`,
      },
    ],
  }),
};

/**
 * テスト用のaddツール
 */
export const addTool: MockTool = {
  name: "add",
  description: "Adds two numbers",
  inputSchema: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" },
    },
    required: ["a", "b"],
  },
  handler: async (args) => ({
    content: [
      {
        type: "text",
        text: `Result: ${(args.a as number) + (args.b as number)}`,
      },
    ],
  }),
};

/**
 * テスト用のmultiplyツール
 */
export const multiplyTool: MockTool = {
  name: "multiply",
  description: "Multiplies two numbers",
  inputSchema: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" },
    },
    required: ["a", "b"],
  },
  handler: async (args) => ({
    content: [
      {
        type: "text",
        text: `Result: ${(args.a as number) * (args.b as number)}`,
      },
    ],
  }),
};

/**
 * E2Eテスト用のモックMCPサーバーをセットアップ
 *
 * - Server A (port 9001): echo, add ツール
 * - Server B (port 9002): multiply ツール
 */
export const setupTestMcpServers = async (): Promise<{
  serverA: RunningMockMcpServer;
  serverB: RunningMockMcpServer;
  stopAll: () => Promise<void>;
}> => {
  const serverA = await createMockMcpServer({
    port: 9001,
    name: "Test Server A",
    tools: [echoTool, addTool],
  });

  const serverB = await createMockMcpServer({
    port: 9002,
    name: "Test Server B",
    tools: [multiplyTool],
  });

  return {
    serverA,
    serverB,
    stopAll: async () => {
      await Promise.all([serverA.stop(), serverB.stop()]);
    },
  };
};
