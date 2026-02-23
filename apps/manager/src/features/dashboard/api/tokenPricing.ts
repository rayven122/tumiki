/**
 * トークンベースのコスト推計
 *
 * MCPリクエストのトークン使用量からコストを推計する。
 * デフォルトの単価は一般的なLLM APIの価格を参考にした概算値。
 */

// トークン単価（1Kトークンあたりのドル）
export const TOKEN_PRICING = {
  inputCostPer1K: 0.01,
  outputCostPer1K: 0.03,
} as const;

/**
 * トークン数からコストを計算
 *
 * @param inputTokens - 入力トークン数
 * @param outputTokens - 出力トークン数
 * @returns コスト（ドル、小数点2桁まで丸め）
 */
export const calculateTokenCost = (
  inputTokens: number,
  outputTokens: number,
): number => {
  const inputCost = (inputTokens / 1000) * TOKEN_PRICING.inputCostPer1K;
  const outputCost = (outputTokens / 1000) * TOKEN_PRICING.outputCostPer1K;
  return Math.round((inputCost + outputCost) * 100) / 100;
};
