/**
 * メタツールハンドラー
 *
 * Dynamic Search のメタツール（search_tools, describe_tools, execute_tool）を処理する
 */

import { getInternalToolsForDynamicSearch } from "../../queries/listTools/listToolsQuery.js";
import { wrapMcpError } from "../../../../shared/errors/wrapMcpError.js";
import { hasFeature } from "@tumiki/license";
import {
  searchTools,
  describeTools,
  executeToolDynamic,
  SearchToolsArgsSchema,
  DescribeToolsArgsSchema,
  CallToolRequestParamsSchema,
} from "../../../dynamicSearch/index.ee.js";

/**
 * ツール実行結果の型
 */
type ToolCallResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
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
export const handleMetaTool = async (
  toolName: string,
  args: unknown,
  mcpServerId: string,
  organizationId: string,
  userId: string,
): Promise<ToolCallResult> => {
  // ライセンスチェック
  if (!hasFeature("dynamic-search")) {
    throw new Error("Dynamic Search is not available in Community Edition");
  }

  try {
    // 内部ツール一覧を取得
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
        const describeResult = await describeTools(
          validatedArgs,
          internalTools,
        );
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
  } catch (error) {
    throw wrapMcpError(error, `Failed to handle meta tool ${toolName}`);
  }
};
