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
import { getAllowedTools, executeTool } from "../services/toolExecutor.js";
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
 * MCPメインハンドラー
 *
 * Low-Level Server APIを使用してJSON-RPC 2.0リクエストを自動処理。
 * authContext.isUnifiedEndpoint の値に応じて、通常MCPサーバーまたは
 * 統合MCPサーバーとして動作する。
 */
export const mcpHandler = async (c: Context<HonoEnv>) => {
  // serverIdはルートパラメータから取得（統合パラメータ名）
  const serverId = c.req.param("serverId");

  // 認証コンテキストから情報を取得
  const authContext = c.get("authContext");
  if (!authContext) {
    throw new Error("Authentication context not found");
  }

  const { organizationId, userId, isUnifiedEndpoint, unifiedMcpServerId } =
    authContext;

  // 統合エンドポイントの場合
  if (isUnifiedEndpoint && unifiedMcpServerId) {
    return handleUnifiedMcpRequest(
      c,
      unifiedMcpServerId,
      organizationId,
      userId,
    );
  }

  // 通常MCPサーバーの場合
  // mcpServerIdはauthContextから取得（通常サーバーでは認証時に設定済み）
  const mcpServerId = authContext.mcpServerId || serverId;
  return handleNormalMcpRequest(c, mcpServerId, organizationId, userId);
};

/**
 * 通常MCPサーバーリクエストを処理
 */
const handleNormalMcpRequest = async (
  c: Context<HonoEnv>,
  mcpServerId: string,
  organizationId: string,
  userId: string,
) => {
  try {
    // MCPサーバーインスタンスを作成
    const server = createNormalMcpServer(mcpServerId, organizationId, userId);

    // HTTPトランスポートを作成（ステートレスモード）
    // Cloud Run向けにセッション管理を無効化
    // enableJsonResponse: true でSSEではなくJSON形式でレスポンスを返す
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ステートレスモード
      enableJsonResponse: true, // PIIマスキングのためJSON形式でレスポンス
    });

    // サーバーとトランスポートを接続
    await server.connect(transport);

    // HonoのFetch APIリクエスト/レスポンスをNode.js形式に変換
    const { req, res } = toReqRes(c.req.raw);

    // HTTPリクエストを処理
    // SDKがJSON-RPC 2.0プロトコル（検証、ルーティング、エラー処理）を自動処理
    // PIIマスキング済みボディがある場合はそれを使用（piiMaskingMiddlewareで設定）
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
      instanceId: mcpServerId,
      logMessage: "Failed to handle MCP request",
    });
  }
};

/**
 * 統合MCPサーバーリクエストを処理
 */
const handleUnifiedMcpRequest = async (
  c: Context<HonoEnv>,
  unifiedMcpServerId: string,
  organizationId: string,
  userId: string,
) => {
  try {
    // 統合MCPサーバー（serverType=UNIFIED）の名前を取得
    const unifiedServer = await db.mcpServer.findUnique({
      where: { id: unifiedMcpServerId },
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
 * 通常MCPサーバーインスタンスを作成
 * Low-Level Server APIを使用して、JSON-RPC 2.0プロトコルを自動処理
 */
const createNormalMcpServer = (
  mcpServerId: string,
  organizationId: string,
  userId: string,
) => {
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
  server.setRequestHandler(InitializeRequestSchema, () => {
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
  // "{template名}__{ツール名}" 形式でツールリストを返す
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // ログ記録用にコンテキストを更新
    updateExecutionContext({
      toolName: "",
      method: "tools/list",
    });

    const tools = await getAllowedTools(mcpServerId);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Tools call handler - SDKが自動的にバリデーションとJSON-RPC形式化
  // "{template名}__{ツール名}" 形式のツール名を受け取り、実行する
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: fullToolName, arguments: args } = request.params;

    const result = await executeTool(
      mcpServerId,
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
