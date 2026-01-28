// Vercel AI Gateway で利用可能なモデル一覧
// デフォルトはコスト効率の良い Claude 3.5 Haiku
export const DEFAULT_CHAT_MODEL = "anthropic/claude-3.5-haiku";

export type ChatModelProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "reasoning";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider: ChatModelProvider;
  features?: string[];
};

// プロバイダーのラベルと表示順序
export const providerLabels: Record<ChatModelProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  reasoning: "推論モデル",
};

// プロバイダーの表示順序
export const providerOrder: ChatModelProvider[] = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "reasoning",
];

// MCPクライアントとして利用可能なモデル（ツール呼び出し対応）
// @see https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway
export const chatModels: ChatModel[] = [
  // ========== Anthropic (Claude) ==========
  // Claude 4.5 シリーズ（最新）
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    description: "最高性能、複雑な推論・創造的タスク向け",
    provider: "anthropic",
    features: ["tool-calling", "reasoning", "premium"],
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "高性能・コスト効率のベストバランス",
    provider: "anthropic",
    features: ["tool-calling", "reasoning", "recommended"],
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "高速・低コスト、日常タスク向け",
    provider: "anthropic",
    features: ["fast", "tool-calling", "lightweight"],
  },
  // Claude 4 シリーズ
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "バランスの取れた高性能モデル",
    provider: "anthropic",
    features: ["tool-calling", "reasoning"],
  },
  // Claude 3.5 シリーズ
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "高性能・コスト効率に優れたモデル",
    provider: "anthropic",
    features: ["tool-calling", "reasoning"],
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    description: "高速・低コスト、軽量タスク向け",
    provider: "anthropic",
    features: ["fast", "tool-calling", "lightweight"],
  },

  // ========== OpenAI ==========
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "マルチモーダル対応の最新モデル",
    provider: "openai",
    features: ["tool-calling", "vision", "multimodal"],
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "高速・低コスト、日常タスク向け",
    provider: "openai",
    features: ["fast", "tool-calling", "lightweight"],
  },

  // ========== Google (Gemini) ==========
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "長いコンテキスト、複雑なタスク向け",
    provider: "google",
    features: ["tool-calling", "reasoning", "long-context"],
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "高速・マルチモーダル対応",
    provider: "google",
    features: ["fast", "tool-calling", "multimodal"],
  },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "超高速・低コスト",
    provider: "google",
    features: ["fast", "tool-calling", "multimodal"],
  },

  // ========== xAI (Grok) ==========
  {
    id: "xai/grok-4.1-fast-non-reasoning",
    name: "Grok 4.1 Fast",
    description: "高速応答、2Mコンテキスト、ツール呼び出し対応",
    provider: "xai",
    features: ["fast", "tool-calling", "long-context"],
  },

  // ========== Reasoning Models (拡張思考) ==========
  {
    id: "anthropic/claude-sonnet-4.5-thinking",
    name: "Claude Sonnet 4.5 (推論)",
    description: "最新の拡張思考、複雑な問題向け",
    provider: "reasoning",
    features: ["reasoning", "extended-thinking", "recommended"],
  },
  {
    id: "anthropic/claude-sonnet-4-thinking",
    name: "Claude Sonnet 4 (推論)",
    description: "深い推論が必要な複雑な問題向け",
    provider: "reasoning",
    features: ["reasoning", "extended-thinking"],
  },
];

// プロバイダー別にモデルをグループ化
export const getModelsByProvider = (
  provider: ChatModelProvider,
): ChatModel[] => {
  return chatModels.filter((model) => model.provider === provider);
};

// モデルIDからモデル情報を取得
export const getModelById = (id: string): ChatModel | undefined => {
  return chatModels.find((model) => model.id === id);
};

// プロバイダー別にモデルをグループ化したオブジェクト（順序付き）
export const getModelsGroupedByProvider = (): Array<{
  provider: ChatModelProvider;
  label: string;
  models: ChatModel[];
}> => {
  return providerOrder
    .map((provider) => ({
      provider,
      label: providerLabels[provider],
      models: getModelsByProvider(provider),
    }))
    .filter((group) => group.models.length > 0);
};

// 後方互換性のため残す
export const modelsByProvider = chatModels.reduce<Record<string, ChatModel[]>>(
  (acc, model) => {
    const provider = model.provider;
    const models = acc[provider] ?? [];
    models.push(model);
    acc[provider] = models;
    return acc;
  },
  {},
);
