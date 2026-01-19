import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";
import type { HonoEnv } from "../types/index.js";
import {
  getAllowedTools,
  executeTool,
  getInternalToolsForDynamicSearch,
} from "../services/toolExecutor.js";
import { handleError } from "../libs/error/handler.js";
import {
  getExecutionContext,
  updateExecutionContext,
} from "../middleware/requestLogging/context.js";
import {
  isMetaTool,
  searchTools,
  describeTools,
  executeToolDynamic,
  type SearchToolsArgs,
  type DescribeToolsArgs,
  type ExecuteToolArgs,
} from "../services/dynamicSearch/index.js";

/**
 * ツール実行結果の型
 */
type ToolCallResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
};

/**
 * メタツールの実行を処理
 *
 * @param toolName - メタツール名 (search_tools, describe_tools, execute_tool)
 * @param args - ツールの引数
 * @param mcpServerId - MCPサーバーID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns ツール実行結果
 */
const handleMetaTool = async (
  toolName: string,
  args: unknown,
  mcpServerId: string,
  organizationId: string,
  userId: string,
): Promise<ToolCallResult> => {
  // 内部ツール一覧を取得（dynamicSearch が有効でも全ツールを取得）
  const internalTools = await getInternalToolsForDynamicSearch(mcpServerId);

  switch (toolName) {
    case "search_tools": {
      const searchResult = await searchTools(
        args as SearchToolsArgs,
        internalTools,
      );
      return {
        content: [
          { type: "text", text: JSON.stringify(searchResult, null, 2) },
        ],
      };
    }

    case "describe_tools": {
      const describeResult = await describeTools(
        args as DescribeToolsArgs,
        internalTools,
      );
      return {
        content: [
          { type: "text", text: JSON.stringify(describeResult, null, 2) },
        ],
      };
    }

    case "execute_tool": {
      return (await executeToolDynamic(
        args as ExecuteToolArgs,
        mcpServerId,
        organizationId,
        userId,
      )) as ToolCallResult;
    }

    default:
      throw new Error(`Unknown meta tool: ${toolName}`);
  }
};

/**
 * MCPメインハンドラー
 * Low-Level Server APIを使用してJSON-RPC 2.0リクエストを自動処理
 */
export const mcpHandler = async (c: Context<HonoEnv>) => {
  const mcpServerId = c.req.param("mcpServerId");

  // 認証コンテキストから情報を取得
  const authContext = c.get("authContext");
  if (!authContext) {
    throw new Error("Authentication context not found");
  }

  const { organizationId, userId } = authContext;

  try {
    // MCPサーバーインスタンスを作成
    const server = createMcpServer(mcpServerId, organizationId, userId);

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
 * MCPサーバーインスタンスを作成
 * Low-Level Server APIを使用して、JSON-RPC 2.0プロトコルを自動処理
 */
const createMcpServer = (
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
  // dynamicSearch=true の場合: メタツール (search_tools, describe_tools, execute_tool) のみ返す
  // dynamicSearch=false の場合: "{template名}__{ツール名}" 形式でツールリストを返す
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // ログ記録用にコンテキストを更新
    updateExecutionContext({
      toolName: "",
      method: "tools/list",
    });

    const { tools } = await getAllowedTools(mcpServerId);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Tools call handler - SDKが自動的にバリデーションとJSON-RPC形式化
  // dynamicSearch=true の場合: メタツール (search_tools, describe_tools, execute_tool) を処理
  // dynamicSearch=false または非メタツールの場合: "{template名}__{ツール名}" 形式のツール名を受け取り、実行する
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: fullToolName, arguments: args } = request.params;

    // メタツールの処理
    if (isMetaTool(fullToolName)) {
      return handleMetaTool(
        fullToolName,
        args,
        mcpServerId,
        organizationId,
        userId,
      );
    }

    // 通常のツール実行
    const result = await executeTool(
      mcpServerId,
      organizationId,
      fullToolName,
      args ?? {},
      userId,
    );

    return result as ToolCallResult;
  });

  return server;
};
