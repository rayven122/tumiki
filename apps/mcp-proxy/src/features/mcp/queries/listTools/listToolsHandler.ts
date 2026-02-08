/**
 * ListTools ハンドラー
 *
 * MCP SDK の ListToolsRequest に対応するハンドラー
 */

import { updateExecutionContext } from "../../middleware/requestLogging/context.js";
import { listToolsQuery } from "./listToolsQuery.js";

/**
 * ListTools ハンドラーを生成
 *
 * @param mcpServerId - McpServer ID
 * @returns ListToolsRequest ハンドラー
 */
export const createListToolsHandler = (mcpServerId: string) => {
  return async () => {
    // ログ記録用にコンテキストを更新
    updateExecutionContext({
      toolName: "",
      method: "tools/list",
    });

    const { tools } = await listToolsQuery({ mcpServerId });

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  };
};
