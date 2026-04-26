import type {
  CallToolResult,
  Logger,
  McpToolInfo,
  ToolPolicyResolver,
} from "../types.js";
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
 * getter関数経由でUpstreamClientのMapを取得し、ツールの集約・ルーティングを行う
 * 毎回getterを呼ぶことで、動的にサーバーが追加・削除された場合も最新状態を参照する
 *
 * @param getToolPolicy ツールごとの公開可否・説明上書きを解決する関数（任意）
 *   未指定時は全ツールを公開・上書きなし（既存挙動）
 */
export const createToolAggregator = (
  getClients: () => ReadonlyMap<string, UpstreamClient>,
  logger: Logger,
  getToolPolicy?: ToolPolicyResolver,
): ToolAggregator => {
  /**
   * 全サーバーのツール一覧を集約（プレフィックス付き）
   * getToolPolicyが指定されていれば isAllowed=false のツールを除外し、customDescriptionで上書きする
   */
  const listTools = async (): Promise<McpToolInfo[]> => {
    const clientList = [...getClients().values()];
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
          const policy = getToolPolicy?.(serverName, tool.name);
          if (policy?.isAllowed === false) continue;
          allTools.push({
            name: toPrefixedName(serverName, tool.name),
            description: policy?.customDescription ?? tool.description,
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
   * getToolPolicy が isAllowed=false を返すツールは呼び出し拒否
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

    const policy = getToolPolicy?.(serverName, toolName);
    if (policy?.isAllowed === false) {
      throw new Error(
        `ツール "${prefixedToolName}" は無効化されているため実行できません`,
      );
    }

    const client = getClients().get(serverName);
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
