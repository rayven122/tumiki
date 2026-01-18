/**
 * MCPハンドラー
 *
 * JSON-RPC 2.0プロトコルを自動処理するMCPサーバーハンドラー。
 * 通常MCPサーバーと統合MCPサーバーの両方をサポート。
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

/** MCP サーバー情報 */
type ServerInfo = {
  name: string;
  version: string;
};

/** ツール取得・実行関数 */
type ToolHandlers = {
  listTools: () => Promise<
    Array<{
      name: string;
      description: string | null;
      inputSchema: Record<string, unknown>;
    }>
  >;
  callTool: (
    fullToolName: string,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
};

/** ツール呼び出し結果の型 */
type ToolCallResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
};

/**
 * ステートレスHTTPトランスポートを作成
 */
const createStatelessTransport = (): StreamableHTTPServerTransport =>
  new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

/**
 * MCPサーバーインスタンスを作成
 */
const createMcpServer = (
  serverInfo: ServerInfo,
  toolHandlers: ToolHandlers,
): Server => {
  const server = new Server(
    { name: serverInfo.name, version: serverInfo.version },
    { capabilities: { tools: {} } },
  );

  // Initialize handler
  server.setRequestHandler(InitializeRequestSchema, () => ({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: serverInfo.name, version: serverInfo.version },
  }));

  // Tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    updateExecutionContext({ toolName: "", method: "tools/list" });
    const tools = await toolHandlers.listTools();
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Tools call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: fullToolName, arguments: args } = request.params;
    const result = await toolHandlers.callTool(fullToolName, args ?? {});
    return result as ToolCallResult;
  });

  return server;
};

/**
 * MCPリクエストを処理
 */
const processMcpRequest = async (
  c: Context<HonoEnv>,
  server: Server,
  instanceId: string,
  organizationId: string,
  logMessage: string,
): Promise<Response> => {
  try {
    const transport = createStatelessTransport();
    await server.connect(transport);

    const { req, res } = toReqRes(c.req.raw);
    const executionContext = getExecutionContext();
    const body: unknown = executionContext?.requestBody ?? (await c.req.json());
    await transport.handleRequest(req, res, body);

    return toFetchResponse(res);
  } catch (error) {
    return handleError(c, error as Error, {
      requestId: null,
      errorCode: -32603,
      errorMessage: "Internal error",
      organizationId,
      instanceId,
      logMessage,
    });
  }
};

/**
 * MCPメインハンドラー
 *
 * authContext.isUnifiedEndpoint の値に応じて、通常MCPサーバーまたは
 * 統合MCPサーバーとして動作する。
 */
export const mcpHandler = async (c: Context<HonoEnv>): Promise<Response> => {
  const serverId = c.req.param("serverId");
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
): Promise<Response> => {
  const server = createMcpServer(
    { name: "Tumiki MCP Proxy", version: "0.1.0" },
    {
      listTools: () => getAllowedTools(mcpServerId),
      callTool: (fullToolName, args) =>
        executeTool(mcpServerId, organizationId, fullToolName, args, userId),
    },
  );

  return processMcpRequest(
    c,
    server,
    mcpServerId,
    organizationId,
    "Failed to handle MCP request",
  );
};

/**
 * 統合MCPサーバー名を取得（エラー時はデフォルト名を返す）
 */
const getUnifiedServerName = async (
  unifiedMcpServerId: string,
): Promise<string> => {
  const unifiedServer = await db.mcpServer.findUnique({
    where: { id: unifiedMcpServerId },
    select: { name: true },
  });

  return unifiedServer?.name ?? "Tumiki Unified MCP";
};

/**
 * 統合MCPサーバーリクエストを処理
 */
const handleUnifiedMcpRequest = async (
  c: Context<HonoEnv>,
  unifiedMcpServerId: string,
  organizationId: string,
  userId: string,
): Promise<Response> => {
  // 統合MCPサーバー名を取得（エラー発生時はデフォルト名を使用）
  let serverName: string;
  try {
    serverName = await getUnifiedServerName(unifiedMcpServerId);
  } catch {
    serverName = "Tumiki Unified MCP";
  }

  const server = createMcpServer(
    { name: serverName, version: "1.0.0" },
    {
      listTools: () => aggregateTools(unifiedMcpServerId),
      callTool: (fullToolName, args) =>
        executeUnifiedTool(
          unifiedMcpServerId,
          organizationId,
          fullToolName,
          args,
          userId,
        ),
    },
  );

  return processMcpRequest(
    c,
    server,
    unifiedMcpServerId,
    organizationId,
    "Failed to handle unified MCP request",
  );
};
