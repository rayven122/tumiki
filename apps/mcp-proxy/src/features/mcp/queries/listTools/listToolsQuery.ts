/**
 * ツールリスト取得クエリ
 *
 * McpServer の allowedTools を取得し、MCP SDK Tool 型に変換する
 */

import { transformTemplateInstancesToTools } from "../../../../domain/services/toolNameResolver.js";
import {
  getToolsWithDynamicSearchFlag,
  getTemplateInstanceTools,
} from "../../../../infrastructure/db/repositories/toolRepository.js";
import { logError, logInfo, logWarn } from "../../../../shared/logger/index.js";
import {
  DYNAMIC_SEARCH_META_TOOLS,
  type Tool,
} from "../../../dynamicSearch/index.js";

/**
 * ツールリスト取得クエリの入力型
 */
export type ListToolsQuery = {
  readonly mcpServerId: string;
};

/**
 * getAllowedTools の戻り値の型
 */
export type GetAllowedToolsResult = {
  /** 公開するツールリスト（MCP SDK Tool 型） */
  tools: Tool[];
  /** Dynamic Search が有効かどうか */
  dynamicSearch: boolean;
};

/**
 * McpServer の allowedTools を取得
 *
 * dynamicSearch が有効な場合は search_tools/describe_tools/execute_tool のみを返す
 * 無効な場合は従来通り全ツールを返す
 *
 * @param query - ツールリスト取得クエリ
 * @returns ツールリスト（"{インスタンス名}__{ツール名}" 形式）と dynamicSearch フラグ
 */
export const listToolsQuery = async (
  query: ListToolsQuery,
): Promise<GetAllowedToolsResult> => {
  const { mcpServerId } = query;
  logInfo("Getting allowed tools", {
    mcpServerId,
  });

  try {
    // McpServer の templateInstances, allowedTools, dynamicSearch を取得
    const mcpServer = await getToolsWithDynamicSearchFlag(mcpServerId);

    if (!mcpServer) {
      throw new Error(`McpServer not found: ${mcpServerId}`);
    }

    // Dynamic Search が有効な場合はメタツールのみを返す
    if (mcpServer.dynamicSearch) {
      // CE版ではメタツールが利用不可能な場合がある
      if (DYNAMIC_SEARCH_META_TOOLS.length === 0) {
        logWarn(
          "Dynamic Search enabled but meta tools not available (CE version). Falling back to normal tools.",
          { mcpServerId },
        );
        // フォールバック: 通常のツールリストを返す（下の処理に進む）
      } else {
        logInfo("Dynamic Search enabled, returning meta tools", {
          mcpServerId,
          metaToolCount: DYNAMIC_SEARCH_META_TOOLS.length,
        });

        return {
          tools: DYNAMIC_SEARCH_META_TOOLS,
          dynamicSearch: true,
        };
      }
    }

    // 全テンプレートインスタンスからallowedToolsを集約
    // "{normalizedName}__{ツール名}" 形式でツールリストを返す
    const tools = transformTemplateInstancesToTools(
      mcpServer.templateInstances,
    );

    logInfo("Retrieved allowed tools", {
      mcpServerId,
      toolCount: tools.length,
    });

    return {
      tools,
      dynamicSearch: false,
    };
  } catch (error) {
    logError("Failed to get allowed tools", error as Error, {
      mcpServerId,
    });

    throw new Error(
      `Failed to get allowed tools for server ${mcpServerId}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Dynamic Search 用の内部ツール一覧を取得
 *
 * dynamicSearch が有効でも全ツールを取得する（search_tools 等で使用）
 *
 * @param mcpServerId - McpServer ID
 * @returns 全ツールリスト（MCP SDK Tool 型）
 */
export const getInternalToolsForDynamicSearch = async (
  mcpServerId: string,
): Promise<Tool[]> => {
  logInfo("Getting internal tools for dynamic search", {
    mcpServerId,
  });

  try {
    const mcpServer = await getTemplateInstanceTools(mcpServerId);

    if (!mcpServer) {
      throw new Error(`McpServer not found: ${mcpServerId}`);
    }

    const tools = transformTemplateInstancesToTools(
      mcpServer.templateInstances,
    );

    logInfo("Retrieved internal tools for dynamic search", {
      mcpServerId,
      toolCount: tools.length,
    });

    return tools;
  } catch (error) {
    logError(
      "Failed to get internal tools for dynamic search",
      error as Error,
      {
        mcpServerId,
      },
    );

    throw new Error(
      `Failed to get internal tools for server ${mcpServerId}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
