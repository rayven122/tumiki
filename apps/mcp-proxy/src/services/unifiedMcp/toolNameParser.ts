/**
 * 統合MCPエンドポイント用ツール名パーサー
 *
 * 3階層ツール名フォーマット: `{mcpServerId}__{instanceName}__{toolName}`
 */

import type { ParsedToolName } from "./types.js";

/** ツール名の区切り文字 */
const TOOL_NAME_SEPARATOR = "__";

/** 期待される区切り数（3階層: mcpServerId, instanceName, toolName） */
const EXPECTED_PARTS = 3;

/**
 * 3階層ツール名をパースして各要素を抽出
 *
 * @param fullToolName - 3階層フォーマットのツール名
 * @returns パース結果（mcpServerId, instanceName, toolName）
 * @throws ツール名フォーマットが不正な場合
 *
 * @example
 * ```typescript
 * const result = parseUnifiedToolName("cm1abc2def3ghi__personal__list_repos");
 * // { mcpServerId: "cm1abc2def3ghi", instanceName: "personal", toolName: "list_repos" }
 * ```
 */
export const parseUnifiedToolName = (fullToolName: string): ParsedToolName => {
  const parts = fullToolName.split(TOOL_NAME_SEPARATOR);

  if (parts.length !== EXPECTED_PARTS) {
    throw new Error(
      `Invalid unified tool name format: "${fullToolName}". ` +
        `Expected format: "{mcpServerId}${TOOL_NAME_SEPARATOR}{instanceName}${TOOL_NAME_SEPARATOR}{toolName}"`,
    );
  }

  const [mcpServerId, instanceName, toolName] = parts;

  // 各パーツが空でないことを確認
  if (!mcpServerId || !instanceName || !toolName) {
    throw new Error(
      `Invalid unified tool name format: "${fullToolName}". ` +
        `All parts (mcpServerId, instanceName, toolName) must be non-empty.`,
    );
  }

  return {
    mcpServerId,
    instanceName,
    toolName,
  };
};

/**
 * 3階層ツール名をフォーマットして生成
 *
 * @param mcpServerId - MCPサーバーID
 * @param instanceName - テンプレートインスタンスの正規化名
 * @param toolName - ツール名（MCPツールの元の名前）
 * @returns 3階層フォーマットのツール名
 *
 * @example
 * ```typescript
 * const name = formatUnifiedToolName("cm1abc2def3ghi", "personal", "list_repos");
 * // "cm1abc2def3ghi__personal__list_repos"
 * ```
 */
export const formatUnifiedToolName = (
  mcpServerId: string,
  instanceName: string,
  toolName: string,
): string => {
  if (!mcpServerId || !instanceName || !toolName) {
    throw new Error(
      `All parts must be non-empty: mcpServerId="${mcpServerId}", ` +
        `instanceName="${instanceName}", toolName="${toolName}"`,
    );
  }

  return `${mcpServerId}${TOOL_NAME_SEPARATOR}${instanceName}${TOOL_NAME_SEPARATOR}${toolName}`;
};
