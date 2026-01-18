/**
 * 統合MCPエンドポイント用ツール名パーサー
 *
 * 3階層ツール名フォーマット: `{mcpServerId}__{instanceName}__{toolName}`
 */

import type { ParsedToolName } from "./types.js";

/** ツール名の区切り文字 */
const SEPARATOR = "__";

/** 期待される階層数 */
const EXPECTED_PARTS = 3;

/**
 * ツール名パーツが有効かどうかを検証
 */
const isValidParts = (parts: string[]): parts is [string, string, string] =>
  parts.length === EXPECTED_PARTS && parts.every((part) => part.length > 0);

/**
 * パースエラーメッセージを生成
 */
const createParseError = (fullToolName: string, reason: string): Error =>
  new Error(
    `Invalid unified tool name format: "${fullToolName}". ${reason} ` +
      `Expected format: "{mcpServerId}${SEPARATOR}{instanceName}${SEPARATOR}{toolName}"`,
  );

/**
 * フォーマットエラーメッセージを生成
 */
const createFormatError = (
  mcpServerId: string,
  instanceName: string,
  toolName: string,
): Error =>
  new Error(
    `All parts must be non-empty: mcpServerId="${mcpServerId}", ` +
      `instanceName="${instanceName}", toolName="${toolName}"`,
  );

/**
 * 3階層ツール名をパースして各要素を抽出
 *
 * @example
 * ```typescript
 * const result = parseUnifiedToolName("cm1abc2def3ghi__personal__list_repos");
 * // { mcpServerId: "cm1abc2def3ghi", instanceName: "personal", toolName: "list_repos" }
 * ```
 */
export const parseUnifiedToolName = (fullToolName: string): ParsedToolName => {
  const parts = fullToolName.split(SEPARATOR);

  if (!isValidParts(parts)) {
    const reason =
      parts.length !== EXPECTED_PARTS
        ? `Got ${parts.length} parts instead of ${EXPECTED_PARTS}.`
        : "All parts must be non-empty.";
    throw createParseError(fullToolName, reason);
  }

  const [mcpServerId, instanceName, toolName] = parts;

  return { mcpServerId, instanceName, toolName };
};

/**
 * 3階層ツール名をフォーマットして生成
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
    throw createFormatError(mcpServerId, instanceName, toolName);
  }

  return [mcpServerId, instanceName, toolName].join(SEPARATOR);
};
