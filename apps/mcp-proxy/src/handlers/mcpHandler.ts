import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { type ReAuthRequiredError } from "@tumiki/oauth-token-manager";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";
import type { HonoEnv } from "../types/index.js";
import {
  getAllowedTools,
  executeTool,
  getInternalToolsForDynamicSearch,
} from "../services/toolExecutor.js";
import {
  handleError,
  toError,
  isReAuthRequiredError,
  createReAuthResponse,
} from "../libs/error/index.js";
import {
  getExecutionContext,
  updateExecutionContext,
} from "../middleware/requestLogging/context.js";
import {
  isMetaTool,
  searchTools,
  describeTools,
  executeToolDynamic,
  SearchToolsArgsSchema,
  DescribeToolsArgsSchema,
  CallToolRequestParamsSchema,
} from "../services/dynamicSearch/index.js";

/**
 * ツール実行結果の型
 */
type ToolCallResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
};

/**
 * ReAuthRequiredError を保存するためのコンテナ
 *
 * SDK の setRequestHandler 内で発生した ReAuthRequiredError を
 * 外側のハンドラーに伝達するために使用。
 * SDK は内部でエラーを JSON-RPC エラーに変換するため、
 * このコンテナを使用して 401 レスポンスを生成する。
 */
type ReAuthErrorContainer = {
  error: ReAuthRequiredError | null;
  requestId: string | number | null;
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
      const validatedArgs = SearchToolsArgsSchema.parse(args);
      const searchResult = await searchTools(validatedArgs, internalTools);
      return {
        content: [
          { type: "text", text: JSON.stringify(searchResult, null, 2) },
        ],
      };
    }

    case "describe_tools": {
      const validatedArgs = DescribeToolsArgsSchema.parse(args);
      const describeResult = await describeTools(validatedArgs, internalTools);
      return {
        content: [
          { type: "text", text: JSON.stringify(describeResult, null, 2) },
        ],
      };
    }

    case "execute_tool": {
      const validatedArgs = CallToolRequestParamsSchema.parse(args);
      const result = await executeToolDynamic(
        validatedArgs,
        mcpServerId,
        organizationId,
        userId,
      );
      return result as ToolCallResult;
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

  // ReAuthRequiredError を保存するためのコンテナ
  // SDK 内部で発生したエラーを外側で処理するために使用
  const reAuthErrorContainer: ReAuthErrorContainer = {
    error: null,
    requestId: null,
  };

  try {
    // MCPサーバーインスタンスを作成（エラーコンテナを渡す）
    const server = createMcpServer(
      mcpServerId,
      organizationId,
      userId,
      reAuthErrorContainer,
    );

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

    // ReAuthRequiredError が発生した場合は 401 レスポンスを返す
    // SDK は内部でエラーを処理するため、ここでキャッチして 401 に変換
    if (reAuthErrorContainer.error) {
      const baseUrl =
        process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";
      const reAuthResponse = createReAuthResponse(
        reAuthErrorContainer.error,
        mcpServerId,
        reAuthErrorContainer.requestId,
        baseUrl,
      );

      return c.json(reAuthResponse.jsonRpcError, 401, reAuthResponse.headers);
    }

    // Node.jsレスポンスをFetch APIレスポンスに変換して返却
    return toFetchResponse(res);
  } catch (error) {
    // 外側で ReAuthRequiredError をキャッチした場合も 401 を返す
    if (isReAuthRequiredError(error)) {
      const baseUrl =
        process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";
      const reAuthResponse = createReAuthResponse(
        error,
        mcpServerId,
        null,
        baseUrl,
      );

      return c.json(reAuthResponse.jsonRpcError, 401, reAuthResponse.headers);
    }

    return handleError(c, toError(error), {
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
 *
 * @param mcpServerId - MCP サーバー ID
 * @param organizationId - 組織 ID
 * @param userId - ユーザー ID
 * @param reAuthErrorContainer - ReAuthRequiredError を保存するためのコンテナ
 */
const createMcpServer = (
  mcpServerId: string,
  organizationId: string,
  userId: string,
  reAuthErrorContainer: ReAuthErrorContainer,
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

    try {
      // メタツールの処理
      if (isMetaTool(fullToolName)) {
        return await handleMetaTool(
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
    } catch (error) {
      // ReAuthRequiredError をコンテナに保存し、SDK にはエラーを伝播させる
      // mcpHandler 側で 401 レスポンスを生成する
      if (isReAuthRequiredError(error)) {
        reAuthErrorContainer.error = error;
        // リクエスト ID が利用可能な場合は保存（MCP SDK の型構造に依存）
        reAuthErrorContainer.requestId = null;
      }
      throw error;
    }
  });

  return server;
};
