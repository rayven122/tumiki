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
 * エラーの種類を分類する
 */
const classifyError = (error: unknown): McpServerError["errorType"] => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("forbidden") ||
      message.includes("403")
    ) {
      return "authentication";
    }
    if (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("econnreset")
    ) {
      return "timeout";
    }
    if (
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("fetch failed")
    ) {
      return "connection";
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
  serverName: string;
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
      name: true,
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
      serverName: server.name,
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
    data?: unknown;
  };
};

/**
 * mcp-proxyにJSON-RPC 2.0でツール呼び出しを送信
 */
const callToolViaProxy = async (
  mcpServerId: string,
  toolName: string,
  args: unknown,
  accessToken: string,
): Promise<unknown> => {
  const proxyUrl = makeHttpProxyServerUrl(mcpServerId);

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

  if (!response.ok) {
    throw new Error(`MCP proxy error: ${response.status}`);
  }

  const result = (await response.json()) as JsonRpcResponse;
  if (result.error) {
    throw new Error(result.error.message || "Unknown MCP error");
  }

  return result.result;
};

/**
 * 遅延接続するexecute関数を作成
 * ツール実行時のみmcp-proxyにHTTPリクエストを送信
 */
const createLazyExecute = (
  mcpServerId: string,
  toolName: string,
  accessToken: string,
): ((args: unknown) => Promise<unknown>) => {
  return async (args: unknown): Promise<unknown> => {
    try {
      const result = await withTimeout(
        callToolViaProxy(mcpServerId, toolName, args, accessToken),
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

      // エラーを含むレスポンスを返す（isError: true で UI にエラー表示される）
      return {
        content: [
          {
            type: "text",
            text: `MCP error: ${errorMessage}`,
          },
        ],
        isError: true,
        errorType,
      };
    }
  };
};

// ============================================================
// 公開 API
// ============================================================

/**
 * ツールとサーバーのマッピング情報
 */
export type ToolServerInfo = {
  serverId: string;
  serverName: string;
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
 * - dynamicSearch=true: `{mcpServerId}__{metaToolName}` (例: "cm123abc__search_tools")
 * - dynamicSearch=false: `{mcpServerId}__{instanceNormalizedName}__{toolName}`
 *   (例: "cm123abc__github__create_issue")
 *
 * mcpServerIdを含めることで、複数サーバーでの衝突を防ぐ。
 * mcp-proxy呼び出し時:
 * - dynamicSearch=true: `{metaToolName}` (例: "search_tools")
 * - dynamicSearch=false: `{instanceNormalizedName}__{toolName}` (例: "github__create_issue")
 * toolServerMapでオリジナルのサーバー名とツール名を保持。
 *
 * @example
 * ```typescript
 * const mcpResult = await getMcpToolsFromServers(serverIds, token);
 *
 * // 遅延接続方式のため、クライアント管理不要
 * const result = streamText({
 *   tools: mcpResult.tools,
 * });
 *
 * // UI表示時はtoolServerMapからサーバー名を取得
 * const serverInfo = mcpResult.toolServerMap[toolName];
 * console.log(serverInfo.serverName); // "Linear MCP" など
 * ```
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
        // AI SDK用の一意キー（複数サーバーでの衝突を防ぐ）
        const uniqueName = `${mcpServerId}__${proxyToolName}`;

        allTools[uniqueName] = {
          description: meta.description,
          inputSchema: jsonSchema(meta.inputSchema as Record<string, unknown>),
          execute: createLazyExecute(mcpServerId, proxyToolName, accessToken),
        };

        toolServerMap[uniqueName] = {
          serverId: mcpServerId,
          serverName: serverDef.serverName,
          originalToolName: meta.name,
        };

        toolNames.push(uniqueName);
      }
    } else {
      // 通常モード: 各ツールのインスタンスnormalizedNameを使用
      for (const toolDef of serverDef.tools) {
        // mcp-proxyに渡すツール名（プロキシはこの形式を期待）
        const proxyToolName = `${toolDef.instanceNormalizedName}__${toolDef.name}`;
        // AI SDK用の一意キー（複数サーバーで同じnormalizedNameの衝突を防ぐ）
        const uniqueName = `${mcpServerId}__${proxyToolName}`;

        // jsonSchema() でJSON SchemaをAI SDK形式に変換
        allTools[uniqueName] = {
          description: toolDef.description,
          inputSchema: jsonSchema(
            toolDef.inputSchema as Record<string, unknown>,
          ),
          execute: createLazyExecute(mcpServerId, proxyToolName, accessToken),
        };

        // サーバー情報をマッピング（UI表示用）
        toolServerMap[uniqueName] = {
          serverId: mcpServerId,
          serverName: serverDef.serverName,
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
