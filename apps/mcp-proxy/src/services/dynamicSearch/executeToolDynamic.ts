/**
 * execute_tool メタツール実装
 *
 * 既存の toolExecutor.executeTool() を呼び出してツールを実行する
 */

import { logError, logInfo } from "../../libs/logger/index.js";
import { executeTool } from "../toolExecutor.js";
import type { ExecuteToolArgs } from "./types.js";

/**
 * execute_tool を実行
 *
 * @param args - 実行引数
 * @param mcpServerId - McpServer ID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns ツール実行結果
 */
export const executeToolDynamic = async (
  args: ExecuteToolArgs,
  mcpServerId: string,
  organizationId: string,
  userId: string,
): Promise<unknown> => {
  const { toolName, arguments: toolArgs } = args;

  logInfo("Executing execute_tool (dynamic)", {
    toolName,
    mcpServerId,
  });

  try {
    // 既存の executeTool を使用
    const result = await executeTool(
      mcpServerId,
      organizationId,
      toolName,
      toolArgs,
      userId,
    );

    logInfo("execute_tool completed", {
      toolName,
      mcpServerId,
    });

    return result;
  } catch (error) {
    logError("Failed to execute execute_tool", error as Error, {
      toolName,
      mcpServerId,
    });
    throw error;
  }
};
