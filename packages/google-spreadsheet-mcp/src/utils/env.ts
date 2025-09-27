/**
 * 環境変数を検証して返す
 * @param key - 環境変数のキー
 * @param value - 環境変数の値
 * @returns 検証済みの環境変数値
 * @throws {Error} 環境変数が未設定または空の場合
 */
export const validateEnvVar = (
  key: string,
  value: string | undefined,
): string => {
  if (!value || value.trim() === "") {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

/**
 * オプショナルな環境変数を取得
 * @param value - 環境変数の値
 * @returns 環境変数値またはundefined
 */
export const getOptionalEnvVar = (
  value: string | undefined,
): string | undefined => {
  if (!value || value.trim() === "") {
    return undefined;
  }
  return value;
};
