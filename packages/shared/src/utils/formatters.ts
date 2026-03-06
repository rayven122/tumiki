/**
 * データサイズを人間が読みやすい形式にフォーマット
 */
export const formatDataSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * トークン数を人間が読みやすい形式にフォーマット
 */
export const formatTokenCount = (tokens: number | null | undefined): string => {
  if (tokens === null || tokens === undefined) return "-";
  if (tokens === 0) return "0";

  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
};

/**
 * トークン削減率を計算
 * @returns 削減率（パーセント）、計算不可の場合はnull
 */
export const calculateTokenReductionRate = (
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null => {
  if (!inputTokens || !outputTokens || inputTokens === 0) return null;
  return Math.round(((inputTokens - outputTokens) / inputTokens) * 100);
};
