// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * execute_tool メタツール実装
 *
 * 既存の toolExecutor.executeTool() を呼び出してツールを実行する
 * MCP SDK の CallToolRequestParams 型を使用
 */

import { toError } from "../../shared/errors/toError.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import { callToolCommand } from "../mcp/commands/callTool/callToolCommand.js";
import type { CallToolRequestParams } from "./types.ee.js";

/**
 * execute_tool を実行
 *
 * @param args - 実行引数（MCP SDK の CallToolRequestParams 形式）
 * @param mcpServerId - McpServer ID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns ツール実行結果
 */
export const executeToolDynamic = async (
  args: CallToolRequestParams,
  mcpServerId: string,
  organizationId: string,
  userId: string,
): Promise<unknown> => {
  const { name: toolName, arguments: toolArgs = {} } = args;

  logInfo("Executing execute_tool (dynamic)", {
    toolName,
    mcpServerId,
  });

  try {
    const result = await callToolCommand({
      mcpServerId,
      organizationId,
      fullToolName: toolName,
      args: toolArgs,
      userId,
    });

    logInfo("execute_tool completed", {
      toolName,
      mcpServerId,
    });

    return result;
  } catch (error) {
    logError("Failed to execute execute_tool", toError(error), {
      toolName,
      mcpServerId,
    });
    throw error;
  }
};
