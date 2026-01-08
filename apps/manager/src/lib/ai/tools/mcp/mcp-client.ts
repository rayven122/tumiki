/**
 * @ai-sdk/mcp を使用した MCP クライアント実装
 * AI SDK Tool 形式への変換を自動的に行う
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
 */
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { makeHttpProxyServerUrl } from "~/utils/url";
import type { Tool } from "ai";

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
 * MCPサーバーからツールとクライアントを取得
 *
 * 重要: ストリーミング時はツール実行のためクライアントを開いたままにする必要があります。
 * 呼び出し元で onFinish/onError コールバックでクライアントを閉じてください。
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools#client-lifecycle
 */
export const getMcpToolsFromServer = async (
  mcpServerId: string,
  accessToken: string,
): Promise<
  | { success: true; tools: Record<string, Tool>; client: MCPClient }
  | { success: false; error: McpServerError }
> => {
  const proxyUrl = makeHttpProxyServerUrl(mcpServerId);

  try {
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: proxyUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // AI SDK Tool 形式で直接取得
    // @ai-sdk/mcp は FlexibleSchema<unknown> を使用するため、Tool 型にキャスト
    const tools = (await client.tools()) as Record<string, Tool>;

    // クライアントも返す（ストリーミング終了時に閉じるため）
    return { success: true, tools, client };
  } catch (error) {
    const errorType = classifyError(error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    // 詳細なエラーログを出力
    console.error(
      `[MCP] Failed to get tools from server ${mcpServerId}:`,
      JSON.stringify(
        {
          errorType,
          message,
          stack: error instanceof Error ? error.stack : undefined,
        },
        null,
        2,
      ),
    );

    return {
      success: false,
      error: {
        mcpServerId,
        errorType,
        message,
        timestamp: new Date(),
      },
    };
  }
};

/**
 * 複数MCPサーバーからツールを取得した結果
 */
export type GetMcpToolsFromServersResult = {
  tools: Record<string, Tool>;
  toolNames: string[];
  /** 成功したサーバーのID */
  successfulServers: string[];
  /** 失敗したサーバーのエラー情報 */
  errors: McpServerError[];
  /** MCPクライアントの配列（ストリーミング終了時に閉じる必要あり） */
  clients: MCPClient[];
};

/**
 * 複数MCPサーバーからツールを取得してマージ
 *
 * ツール名形式: `{mcpServerId}__{originalToolName}`
 * これにより、異なるMCPサーバーの同名ツールを区別
 *
 * 一部のサーバーが失敗しても、成功したサーバーからのツールは返される。
 * 失敗情報は errors 配列に格納され、呼び出し元で適切に処理できる。
 *
 * 重要: 返されたクライアントは onFinish/onError で閉じる必要があります。
 *
 * @example
 * ```typescript
 * const mcpResult = await getMcpToolsFromServers(serverIds, token);
 *
 * const result = streamText({
 *   tools: mcpResult.tools,
 *   onFinish: async () => {
 *     await closeMcpClients(mcpResult.clients);
 *   },
 *   onError: async () => {
 *     await closeMcpClients(mcpResult.clients);
 *   },
 * });
 * ```
 */
export const getMcpToolsFromServers = async (
  mcpServerIds: string[],
  accessToken: string,
): Promise<GetMcpToolsFromServersResult> => {
  const allTools: Record<string, Tool> = {};
  const toolNames: string[] = [];
  const successfulServers: string[] = [];
  const errors: McpServerError[] = [];
  const clients: MCPClient[] = [];

  // 並列でツール取得
  const results = await Promise.all(
    mcpServerIds.map(async (mcpServerId) => {
      const result = await getMcpToolsFromServer(mcpServerId, accessToken);
      return { mcpServerId, result };
    }),
  );

  for (const { mcpServerId, result } of results) {
    if (result.success) {
      successfulServers.push(mcpServerId);
      clients.push(result.client);
      // ツール名にサーバーIDをプレフィックス
      for (const [toolName, tool] of Object.entries(result.tools)) {
        const uniqueName = `${mcpServerId}__${toolName}`;
        allTools[uniqueName] = tool;
        toolNames.push(uniqueName);
      }
    } else {
      errors.push(result.error);
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
    successfulServers,
    errors,
    clients,
  };
};

/**
 * MCPクライアントを安全に閉じる
 *
 * ストリーミング終了時（onFinish/onError）に呼び出してください。
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools#client-lifecycle
 */
export const closeMcpClients = async (clients: MCPClient[]): Promise<void> => {
  if (clients.length === 0) return;

  try {
    await Promise.all(
      clients.map(async (client) => {
        try {
          await client.close();
        } catch (error) {
          // クライアントが既に閉じられている場合などのエラーは無視
          console.warn(
            "[MCP] Error closing client:",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      }),
    );
    console.log(`[MCP] Closed ${clients.length} MCP client(s)`);
  } catch (error) {
    console.error(
      "[MCP] Failed to close clients:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
