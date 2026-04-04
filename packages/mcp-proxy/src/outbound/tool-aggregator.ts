import type { CallToolResult, Logger, McpToolInfo } from "../types.js";
import type { UpstreamClient } from "./upstream-client.js";

// プレフィックス区切り文字（設計書 §3.8: {serverName}__{toolName}）
const PREFIX_SEPARATOR = "__";

/**
 * ToolAggregator型
 * 複数MCPサーバーのツールを集約し、プレフィックス付きでルーティングする
 */
export type ToolAggregator = {
  listTools: () => Promise<McpToolInfo[]>;
  callTool: (
    prefixedToolName: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResult>;
};

/**
 * プレフィックス付きツール名を生成
 */
const toPrefixedName = (serverName: string, toolName: string): string =>
  `${serverName}${PREFIX_SEPARATOR}${toolName}`;

/**
 * プレフィックス付きツール名をパース
 * @returns [serverName, toolName] または null（パース失敗時）
 */
const parsePrefixedName = (prefixedName: string): [string, string] | null => {
  const idx = prefixedName.indexOf(PREFIX_SEPARATOR);
  if (idx <= 0) return null;
  return [
    prefixedName.slice(0, idx),
    prefixedName.slice(idx + PREFIX_SEPARATOR.length),
  ];
};

/**
 * ToolAggregatorを作成
 * UpstreamClientのMapを受け取り、ツールの集約・ルーティングを行う
 */
export const createToolAggregator = (
  clients: ReadonlyMap<string, UpstreamClient>,
  logger: Logger,
): ToolAggregator => {
  /**
   * 全サーバーのツール一覧を集約（プレフィックス付き）
   */
  const listTools = async (): Promise<McpToolInfo[]> => {
    const clientList = [...clients.values()];
    const results = await Promise.allSettled(
      clientList.map(async (client) => {
        const tools = await client.listTools();
        return { client, tools };
      }),
    );

    const allTools: McpToolInfo[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        const serverName = result.value.client.getName();
        for (const tool of result.value.tools) {
          allTools.push({
            name: toPrefixedName(serverName, tool.name),
            description: tool.description,
            inputSchema: tool.inputSchema,
            serverName,
          });
        }
      } else {
        logger.error("ツール一覧の取得に失敗したサーバーがあります", {
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
    return allTools;
  };

  /**
   * プレフィックス付きツール名から対象サーバーを特定して実行
   */
  const callTool = async (
    prefixedToolName: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> => {
    const parsed = parsePrefixedName(prefixedToolName);
    if (!parsed) {
      throw new Error(
        `ツール名 "${prefixedToolName}" のフォーマットが不正です（"サーバー名${PREFIX_SEPARATOR}ツール名" 形式が必要です）`,
      );
    }

    const [serverName, toolName] = parsed;
    const client = clients.get(serverName);
    if (!client) {
      throw new Error(
        `サーバー "${serverName}" が見つかりません（ツール: "${prefixedToolName}"）`,
      );
    }

    if (client.getStatus() !== "running") {
      throw new Error(
        `サーバー "${serverName}" は稼働していません（status: ${client.getStatus()}）`,
      );
    }

    return await client.callTool(toolName, args);
  };

  return { listTools, callTool };
};
