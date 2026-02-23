/**
 * トークンベースのコスト推計
 *
 * MCPリクエストのトークン使用量からコストを推計する。
 * デフォルトの単価は一般的なLLM APIの価格を参考にした概算値。
 * モデル別の単価テーブルにより、エージェントごとの正確なコスト推計が可能。
 */

// モデル別単価（1Kトークンあたりのドル）
type ModelPricingEntry = {
  inputCostPer1K: number;
  outputCostPer1K: number;
};

// デフォルトのトークン単価（1Kトークンあたりのドル）
export const TOKEN_PRICING = {
  inputCostPer1K: 0.01,
  outputCostPer1K: 0.03,
} as const;

// モデル別トークン単価（1Kトークンあたりのドル）
export const MODEL_PRICING: ReadonlyMap<string, ModelPricingEntry> = new Map([
  // Anthropic
  ["anthropic/claude-opus-4.5", { inputCostPer1K: 0.015, outputCostPer1K: 0.075 }],
  ["anthropic/claude-sonnet-4.5", { inputCostPer1K: 0.003, outputCostPer1K: 0.015 }],
  ["anthropic/claude-haiku-4.5", { inputCostPer1K: 0.001, outputCostPer1K: 0.005 }],
  ["anthropic/claude-sonnet-4", { inputCostPer1K: 0.003, outputCostPer1K: 0.015 }],
  ["anthropic/claude-3.5-sonnet", { inputCostPer1K: 0.003, outputCostPer1K: 0.015 }],
  ["anthropic/claude-3.5-haiku", { inputCostPer1K: 0.001, outputCostPer1K: 0.005 }],
  // OpenAI
  ["openai/gpt-4o", { inputCostPer1K: 0.0025, outputCostPer1K: 0.01 }],
  ["openai/gpt-4o-mini", { inputCostPer1K: 0.00015, outputCostPer1K: 0.0006 }],
  // Google
  ["google/gemini-2.5-flash", { inputCostPer1K: 0.00015, outputCostPer1K: 0.0035 }],
  ["google/gemini-2.5-pro", { inputCostPer1K: 0.00125, outputCostPer1K: 0.01 }],
  ["google/gemini-2.0-flash", { inputCostPer1K: 0.0001, outputCostPer1K: 0.0004 }],
  // xAI
  ["xai/grok-4.1-fast-non-reasoning", { inputCostPer1K: 0.003, outputCostPer1K: 0.015 }],
]);

/** モデルIDから単価を取得（完全一致 → 前方一致 → デフォルト） */
export const getModelPricing = (
  modelId: string | null | undefined,
): ModelPricingEntry => {
  if (!modelId || modelId === "auto") return TOKEN_PRICING;

  // 完全一致を先にチェック
  const exact = MODEL_PRICING.get(modelId);
  if (exact) return exact;

  // 前方一致でマッチ（バージョン付きモデルIDに対応）
  for (const [key, pricing] of MODEL_PRICING) {
    if (modelId.startsWith(key)) return pricing;
  }

  return TOKEN_PRICING;
};

/** デフォルト単価でトークンコストを計算（ドル、小数点2桁丸め） */
export const calculateTokenCost = (
  inputTokens: number,
  outputTokens: number,
): number => {
  const inputCost = (inputTokens / 1000) * TOKEN_PRICING.inputCostPer1K;
  const outputCost = (outputTokens / 1000) * TOKEN_PRICING.outputCostPer1K;
  return Math.round((inputCost + outputCost) * 100) / 100;
};

/** モデル別単価でトークンコストを計算（ドル、小数点2桁丸め） */
export const calculateTokenCostByModel = (
  modelId: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number => {
  const pricing = getModelPricing(modelId);
  const inputCost = (inputTokens / 1000) * pricing.inputCostPer1K;
  const outputCost = (outputTokens / 1000) * pricing.outputCostPer1K;
  return Math.round((inputCost + outputCost) * 100) / 100;
};
