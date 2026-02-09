/**
 * 環境変数から数値を取得するユーティリティ
 *
 * 文字列を整数に変換し、変換できない場合はデフォルト値を返す
 */

/**
 * 文字列を整数に変換し、変換できない場合はデフォルト値を返す
 *
 * @param value - 変換する文字列（undefined可）
 * @param defaultValue - 変換できない場合のデフォルト値
 * @returns 変換された整数またはデフォルト値
 */
export const parseIntWithDefault = (
  value: string | undefined,
  defaultValue: number,
): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};
