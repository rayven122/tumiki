/**
 * MCP クライアント実装（パフォーマンス最適化版）
 *
 * DBからツール定義を取得し、ツール実行時のみmcp-proxyに接続する遅延接続方式。
 * チャットAPI初期レスポンスを200-300ms削減。
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
 */
import { jsonSchema, type Tool } from "ai";
import { makeHttpProxyServerUrl } from "~/utils/url";
import { db } from "@tumiki/db/server";
import { DYNAMIC_SEARCH_META_TOOLS } from "./dynamic-search-meta-tools";

/** MCPツール実行のデフォルトタイムアウト（ミリ秒） */
const MCP_TOOL_TIMEOUT_MS = 30000; // 30秒

/**
 * MCPサーバーエラー情報
 */
export type McpServerError = {
  mcpServerId: string;
  errorType: "connection" | "authentication" | "timeout" | "unknown";
  message: string;
  timestamp: Date;
};

/**
 * MCPツール実行時のエラーレスポンス型
 */
type McpToolErrorResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
  errorType: McpServerError["errorType"];
  requiresReauth?: boolean;
  mcpServerId?: string;
};

/**
 * MCPツール実行時のエラーレスポンスを生成
 */
const createMcpToolErrorResponse = (
  errorMessage: string,
  errorType: McpServerError["errorType"],
  mcpServerId: string,
  requiresReauth: boolean,
): McpToolErrorResponse => ({
  content: [{ type: "text", text: errorMessage }],
  isError: true,
  errorType,
  ...(requiresReauth && {
    requiresReauth: true,
    mcpServerId,
  }),
});

/**
 * エラー分類用のキーワード定義
 */
const ERROR_CLASSIFICATION_KEYWORDS = {
  authentication: ["unauthorized", "401", "forbidden", "403"],
  timeout: ["timeout", "timed out", "econnreset"],
  connection: ["econnrefused", "network", "failed to fetch", "fetch failed"],
} as const;

/**
 * エラーの種類を分類する
 */
const classifyError = (error: unknown): McpServerError["errorType"] => {
  if (!(error instanceof Error)) {
    return "unknown";
  }

  const message = error.message.toLowerCase();

  for (const [errorType, keywords] of Object.entries(
    ERROR_CLASSIFICATION_KEYWORDS,
  )) {
    if (keywords.some((keyword) => message.includes(keyword))) {
      return errorType as McpServerError["errorType"];
    }
  }

  return "unknown";
};

/**
 * タイムアウト付きでPromiseを実行
 * Promise.race終了後にタイマーをクリアしてメモリリークを防止
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// ============================================================
// DB からツール定義を取得する関数
// ============================================================

/**
 * ツール定義の型（インスタンス情報付き）
 */
type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
  instanceNormalizedName: string;
};

/**
 * サーバーごとのツール定義
 */
type ServerToolDefinitions = {
  serverId: string;
  serverSlug: string;
  tools: ToolDefinition[];
  dynamicSearch: boolean;
};

/**
 * DBからMCPサーバーのツール定義を取得
 * HTTP接続なしで高速にツール情報を取得
 */
const getToolDefinitionsFromDb = async (
  mcpServerIds: string[],
): Promise<Map<string, ServerToolDefinitions>> => {
  if (mcpServerIds.length === 0) {
    return new Map();
  }

  const servers = await db.mcpServer.findMany({
    where: {
      id: { in: mcpServerIds },
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      dynamicSearch: true,
      templateInstances: {
        where: { isEnabled: true },
        select: {
          normalizedName: true,
          allowedTools: {
            select: {
              name: true,
              description: true,
              inputSchema: true,
            },
          },
        },
      },
    },
  });

  const result = new Map<string, ServerToolDefinitions>();
  for (const server of servers) {
    // 各ツールにインスタンスのnormalizedNameを付与
    const tools = server.templateInstances.flatMap((instance) =>
      instance.allowedTools.map((tool) => ({
        ...tool,
        instanceNormalizedName: instance.normalizedName,
      })),
    );
    result.set(server.id, {
      serverId: server.id,
      serverSlug: server.slug,
      tools,
      dynamicSearch: server.dynamicSearch,
    });
  }
  return result;
};

// ============================================================
// 遅延接続 execute ラッパー
// ============================================================

/**
 * JSON-RPC 2.0 レスポンスの型
 */
type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: {
      type?: string;
      resource_metadata?: string;
    };
  };
};

/**
 * 再認証が必要なエラーを示すカスタムエラー
 */
class ReAuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReAuthRequiredError";
  }
}

/**
 * mcp-proxyにJSON-RPC 2.0でツール呼び出しを送信
 */
const callToolViaProxy = async (
  mcpServerSlug: string,
  mcpServerId: string,
  toolName: string,
  args: unknown,
  accessToken: string,
): Promise<unknown> => {
  const proxyUrl = makeHttpProxyServerUrl(mcpServerSlug);

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // MCP SDK StreamableHTTPServerTransportは両方のContent-Typeを受け入れる必要がある
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  // 401エラーの場合は再認証が必要
  if (response.status === 401) {
    throw new ReAuthRequiredError(
      "認証の有効期限が切れました。再認証が必要です。",
    );
  }

  if (!response.ok) {
    throw new Error(`MCP proxy error: ${response.status}`);
  }

  const result = (await response.json()) as JsonRpcResponse;

  // JSON-RPCエラーでReAuthRequiredを検出（PR #729の形式）
  if (result.error) {
    if (result.error.data?.type === "ReAuthRequired") {
      throw new ReAuthRequiredError(
        result.error.message ||
          "認証の有効期限が切れました。再認証が必要です。",
      );
    }
    throw new Error(result.error.message || "Unknown MCP error");
  }

  return result.result;
};

/**
 * 遅延接続するexecute関数を作成
 * ツール実行時のみmcp-proxyにHTTPリクエストを送信
 */
const createLazyExecute = (
  mcpServerSlug: string,
  mcpServerId: string,
  toolName: string,
  accessToken: string,
): ((args: unknown) => Promise<unknown>) => {
  return async (args: unknown): Promise<unknown> => {
    try {
      const result = await withTimeout(
        callToolViaProxy(
          mcpServerSlug,
          mcpServerId,
          toolName,
          args,
          accessToken,
        ),
        MCP_TOOL_TIMEOUT_MS,
        `MCP tool '${toolName}' timed out after ${MCP_TOOL_TIMEOUT_MS}ms`,
      );
      return result;
    } catch (error) {
      const errorType = classifyError(error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `[MCP Tool Error] ${toolName}:`,
        JSON.stringify({ errorType, errorMessage }, null, 2),
      );

      // 再認証が必要なエラーの場合、requiresReauth フラグを追加
      const requiresReauth = error instanceof ReAuthRequiredError;
      const displayMessage = requiresReauth
        ? "認証の有効期限が切れました"
        : `MCP error: ${errorMessage}`;

      // エラーを含むレスポンスを返す（isError: true で UI にエラー表示される）
      return createMcpToolErrorResponse(
        displayMessage,
        errorType,
        mcpServerId,
        requiresReauth,
      );
    }
  };
};

// ============================================================
// 公開 API
// ============================================================

/**
 * ツールとサーバーのマッピング情報
 * slugはツール名に含まれるため、originalToolNameのみ保持
 */
export type ToolServerInfo = {
  originalToolName: string;
};

/**
 * 複数MCPサーバーからツールを取得した結果
 */
export type GetMcpToolsFromServersResult = {
  tools: Record<string, Tool>;
  toolNames: string[];
  /** ツール名からサーバー情報へのマッピング（UI表示用） */
  toolServerMap: Record<string, ToolServerInfo>;
  /** 成功したサーバーのID */
  successfulServers: string[];
  /** 失敗したサーバーのエラー情報 */
  errors: McpServerError[];
};

/**
 * 複数MCPサーバーからツールを取得してマージ
 *
 * パフォーマンス最適化: DBからツール定義を取得し、ツール実行時のみmcp-proxyに接続。
 * 従来の方式と比較して、チャットAPI初期レスポンスを200-300ms削減。
 *
 * ツール名形式（AI SDKキー）:
 * - dynamicSearch=true: `{slug}__{metaToolName}` (例: "linear-mcp__search_tools")
 * - dynamicSearch=false: `{slug}__{instanceNormalizedName}__{toolName}`
 *   (例: "linear-mcp__github__create_issue")
 *
 * slugは組織内でユニークなため、複数サーバーでの衝突を防ぐ。
 * mcp-proxy呼び出し時:
 * - dynamicSearch=true: `{metaToolName}` (例: "search_tools")
 * - dynamicSearch=false: `{instanceNormalizedName}__{toolName}` (例: "github__create_issue")
 * UI表示時はツール名から直接slugを抽出可能。
 */
export const getMcpToolsFromServers = async (
  mcpServerIds: string[],
  accessToken: string,
): Promise<GetMcpToolsFromServersResult> => {
  const allTools: Record<string, Tool> = {};
  const toolNames: string[] = [];
  const toolServerMap: Record<string, ToolServerInfo> = {};
  const successfulServers: string[] = [];
  const errors: McpServerError[] = [];

  // DBからツール定義を取得（HTTP接続なし）
  const serverDefinitions = await getToolDefinitionsFromDb(mcpServerIds);

  for (const mcpServerId of mcpServerIds) {
    const serverDef = serverDefinitions.get(mcpServerId);
    if (!serverDef) {
      errors.push({
        mcpServerId,
        errorType: "unknown",
        message: "サーバーが見つかりません",
        timestamp: new Date(),
      });
      continue;
    }

    successfulServers.push(mcpServerId);

    // dynamicSearch有効時はメタツールを使用
    // mcp-proxyはメタツールをプレフィックスなしで返す・受け付ける
    if (serverDef.dynamicSearch) {
      for (const meta of DYNAMIC_SEARCH_META_TOOLS) {
        // mcp-proxyに渡すツール名（プロキシはプレフィックスなしを期待）
        const proxyToolName = meta.name;
        // AI SDK用の一意キー（slugで識別、組織内でユニーク）
        const uniqueName = `${serverDef.serverSlug}__${proxyToolName}`;

        allTools[uniqueName] = {
          description: meta.description,
          inputSchema: jsonSchema(meta.inputSchema as Record<string, unknown>),
          execute: createLazyExecute(
            serverDef.serverSlug,
            mcpServerId,
            proxyToolName,
            accessToken,
          ),
        };

        toolServerMap[uniqueName] = {
          originalToolName: meta.name,
        };

        toolNames.push(uniqueName);
      }
    } else {
      // 通常モード: 各ツールのインスタンスnormalizedNameを使用
      for (const toolDef of serverDef.tools) {
        // mcp-proxyに渡すツール名（プロキシはこの形式を期待）
        const proxyToolName = `${toolDef.instanceNormalizedName}__${toolDef.name}`;
        // AI SDK用の一意キー（slugで識別、組織内でユニーク）
        const uniqueName = `${serverDef.serverSlug}__${proxyToolName}`;

        // jsonSchema() でJSON SchemaをAI SDK形式に変換
        allTools[uniqueName] = {
          description: toolDef.description,
          inputSchema: jsonSchema(
            toolDef.inputSchema as Record<string, unknown>,
          ),
          execute: createLazyExecute(
            serverDef.serverSlug,
            mcpServerId,
            proxyToolName,
            accessToken,
          ),
        };

        // サーバー情報をマッピング（UI表示用）
        toolServerMap[uniqueName] = {
          originalToolName: toolDef.name,
        };

        toolNames.push(uniqueName);
      }
    }
  }

  // エラーがあった場合はサマリーをログ出力
  if (errors.length > 0) {
    console.warn(
      `[MCP] ${errors.length}/${mcpServerIds.length} servers failed to respond:`,
      errors.map((e) => `${e.mcpServerId} (${e.errorType})`).join(", "),
    );
  }

  return {
    tools: allTools,
    toolNames,
    toolServerMap,
    successfulServers,
    errors,
  };
};
