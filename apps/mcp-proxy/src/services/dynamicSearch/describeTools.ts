/**
 * describe_tools メタツール実装
 *
 * 指定されたツールの詳細スキーマを取得する
 */

import { logInfo, logWarn } from "../../libs/logger/index.js";
import type { DescribeToolsArgs, ToolInfo } from "./types.js";

/**
 * describe_tools の結果
 */
export type DescribeToolsResult = {
  /** ツール名 */
  toolName: string;
  /** ツールの説明 */
  description: string | null;
  /** ツールの入力スキーマ（JSON Schema形式） */
  inputSchema: Record<string, unknown>;
  /** ツールが見つかったかどうか */
  found: boolean;
};

/**
 * describe_tools を実行
 *
 * @param args - 引数
 * @param internalTools - 内部ツールリスト（dynamicSearchが有効でも全ツール）
 * @returns ツールの詳細情報配列
 */
export const describeTools = async (
  args: DescribeToolsArgs,
  internalTools: ToolInfo[],
): Promise<DescribeToolsResult[]> => {
  const { toolNames } = args;

  logInfo("Executing describe_tools", {
    toolNames,
    totalTools: internalTools.length,
  });

  // ツール名からツール情報を取得
  const results: DescribeToolsResult[] = toolNames.map((toolName) => {
    const tool = internalTools.find((t) => t.name === toolName);

    if (!tool) {
      logWarn("Tool not found in describe_tools", { toolName });
      return {
        toolName,
        description: null,
        inputSchema: {},
        found: false,
      };
    }

    return {
      toolName: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      found: true,
    };
  });

  const foundCount = results.filter((r) => r.found).length;

  logInfo("describe_tools completed", {
    requestedCount: toolNames.length,
    foundCount,
  });

  return results;
};
