import { DomainError } from "../errors/domainError.js";

/**
 * 名前空間付きツール名 Value Object
 *
 * "{インスタンス名}__{ツール名}" 形式のツール名を表現
 */
type NamespacedToolName = {
  readonly instanceName: string;
  readonly toolName: string;
  readonly fullName: string;
};

/**
 * ツール名をパースして NamespacedToolName に変換
 *
 * @param fullName - "{インスタンス名}__{ツール名}" 形式のツール名
 * @returns パース結果
 * @throws DomainError 形式が不正な場合
 */
export const parseNamespacedToolName = (
  fullName: string,
): NamespacedToolName => {
  const separatorIndex = fullName.indexOf("__");
  if (
    separatorIndex === -1 ||
    separatorIndex === 0 ||
    separatorIndex === fullName.length - 2
  ) {
    throw new DomainError(
      "INVALID_TOOL_NAME",
      `ツール名の形式が不正です: ${fullName}。"{インスタンス名}__{ツール名}" 形式が必要です`,
    );
  }

  const instanceName = fullName.slice(0, separatorIndex);
  const toolName = fullName.slice(separatorIndex + 2);

  return { instanceName, toolName, fullName };
};

export type { NamespacedToolName };
