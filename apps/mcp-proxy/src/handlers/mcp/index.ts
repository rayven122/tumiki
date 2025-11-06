import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { getAllTools, callTool } from "../../libs/mcp/index.js";
import { handleError } from "../../libs/error/handler.js";

/**
 * MCPサーバーインスタンスを作成
 * Low-Level Server APIを使用して、JSON-RPC 2.0プロトコルを自動処理
 */
const createMcpServer = (instanceId: string) => {
  const server = new Server(
    {
      name: "Tumiki MCP Proxy",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Initialize handler - SDKが自動的にプロトコルハンドシェイク処理
  server.setRequestHandler(InitializeRequestSchema, async () => {
    return {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: "Tumiki MCP Proxy",
        version: "0.1.0",
      },
    };
  });

  // Tools list handler - SDKが自動的にバリデーションとJSON-RPC形式化
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await getAllTools(instanceId);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Tools call handler - SDKが自動的にバリデーションとJSON-RPC形式化
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const result = await callTool(instanceId, name, args ?? {});

    return { content: result.content };
  });

  return server;
};

/**
 * MCPメインハンドラー
 * Low-Level Server APIを使用してJSON-RPC 2.0リクエストを自動処理
 */
export const mcpHandler = async (c: Context<HonoEnv>) => {
  const authInfo = c.get("authInfo");
  const userMcpServerInstanceId = c.req.param("userMcpServerInstanceId");

  try {
    // MCPサーバーインスタンスを作成
    const server = createMcpServer(userMcpServerInstanceId);

    // HTTPトランスポートを作成（ステートレスモード）
    // Cloud Run向けにセッション管理を無効化
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ステートレスモード
    });

    // サーバーとトランスポートを接続
    await server.connect(transport);

    // HonoのFetch APIリクエスト/レスポンスをNode.js形式に変換
    const { req, res } = toReqRes(c.req.raw);

    // HTTPリクエストを処理
    // SDKがJSON-RPC 2.0プロトコル（検証、ルーティング、エラー処理）を自動処理
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await c.req.json();
    await transport.handleRequest(req, res, body);

    // Node.jsレスポンスをFetch APIレスポンスに変換して返却
    return toFetchResponse(res);
  } catch (error) {
    return handleError(c, error as Error, {
      requestId: null,
      errorCode: -32603,
      errorMessage: "Internal error",
      authInfo,
      instanceId: userMcpServerInstanceId,
      logMessage: "Failed to handle MCP request",
    });
  }
};
