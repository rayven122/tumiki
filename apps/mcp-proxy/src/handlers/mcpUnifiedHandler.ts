/**
 * 統合MCPエンドポイントハンドラー
 *
 * 複数のMCPサーバーを単一エンドポイントで公開するためのハンドラー。
 * MCP SDK Server クラスを使用してJSON-RPC 2.0リクエストを処理。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";
import { db } from "@tumiki/db/server";
import type { HonoEnv } from "../types/index.js";
import {
  aggregateTools,
  executeUnifiedTool,
} from "../services/unifiedMcp/index.js";
import { handleError } from "../libs/error/handler.js";
import {
  getExecutionContext,
  updateExecutionContext,
} from "../middleware/requestLogging/context.js";

/**
 * 統合MCPメインハンドラー
 *
 * Low-Level Server APIを使用してJSON-RPC 2.0リクエストを自動処理。
 * 複数のMCPサーバーからのツールを3階層フォーマットで統合して公開。
 */
export const mcpUnifiedHandler = async (c: Context<HonoEnv>) => {
  const unifiedId = c.req.param("unifiedId");

  // 認証コンテキストから情報を取得
  const authContext = c.get("authContext");
  if (!authContext) {
    throw new Error("Authentication context not found");
  }

  const { organizationId, userId, unifiedMcpServerId } = authContext;

  // 統合エンドポイントでない場合はエラー
  if (!authContext.isUnifiedEndpoint || !unifiedMcpServerId) {
    throw new Error("This handler requires unified endpoint authentication");
  }

  try {
    // UnifiedMcpServer の名前を取得
    const unifiedServer = await db.unifiedMcpServer.findUnique({
      where: { id: unifiedId },
      select: { name: true },
    });

    const serverName = unifiedServer?.name ?? "Tumiki Unified MCP";

    // MCPサーバーインスタンスを作成
    const server = createUnifiedMcpServer(
      serverName,
      unifiedMcpServerId,
      organizationId,
      userId,
    );

    // HTTPトランスポートを作成（ステートレスモード）
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ステートレスモード
      enableJsonResponse: true, // JSON形式でレスポンス
    });

    // サーバーとトランスポートを接続
    await server.connect(transport);

    // HonoのFetch APIリクエスト/レスポンスをNode.js形式に変換
    const { req, res } = toReqRes(c.req.raw);

    // HTTPリクエストを処理
    const executionContext = getExecutionContext();
    const body: unknown = executionContext?.requestBody ?? (await c.req.json());
    await transport.handleRequest(req, res, body);

    // Node.jsレスポンスをFetch APIレスポンスに変換して返却
    return toFetchResponse(res);
  } catch (error) {
    return handleError(c, error as Error, {
      requestId: null,
      errorCode: -32603,
      errorMessage: "Internal error",
      organizationId,
      instanceId: unifiedMcpServerId,
      logMessage: "Failed to handle unified MCP request",
    });
  }
};

/**
 * 統合MCPサーバーインスタンスを作成
 *
 * @param serverName - UnifiedMcpServer.name
 * @param unifiedMcpServerId - 統合MCPサーバーID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 */
const createUnifiedMcpServer = (
  serverName: string,
  unifiedMcpServerId: string,
  organizationId: string,
  userId: string,
) => {
  const server = new Server(
    {
      name: serverName,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Initialize handler
  server.setRequestHandler(InitializeRequestSchema, () => {
    return {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: serverName,
        version: "1.0.0",
      },
    };
  });

  // Tools list handler - 3階層フォーマットでツールリストを返す
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // ログ記録用にコンテキストを更新
    updateExecutionContext({
      toolName: "",
      method: "tools/list",
    });

    const tools = await aggregateTools(unifiedMcpServerId);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Tools call handler - 3階層フォーマットのツール名を受け取り、実行する
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: fullToolName, arguments: args } = request.params;

    const result = await executeUnifiedTool(
      unifiedMcpServerId,
      organizationId,
      fullToolName,
      args ?? {},
      userId,
    );

    return result as {
      content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    };
  });

  return server;
};
