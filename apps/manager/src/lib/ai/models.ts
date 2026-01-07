// Vercel AI Gateway で利用可能なモデル一覧
// デフォルトはコスト効率の良い Gemini 2.0 Flash
export const DEFAULT_CHAT_MODEL = "google/gemini-2.0-flash";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider: "anthropic" | "openai" | "google" | "xai" | "reasoning";
  features?: string[];
};

// MCPクライアントとして利用可能なモデル（ツール呼び出し対応）
export const chatModels: ChatModel[] = [
  // ========== Anthropic (Claude) ==========
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "高速・低コスト、シンプルなタスク向け",
    provider: "anthropic",
    features: ["fast", "tool-calling", "lightweight"],
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "バランスの取れた高性能モデル",
    provider: "anthropic",
    features: ["tool-calling", "reasoning"],
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    description: "最高精度、複雑なタスク向け",
    provider: "anthropic",
    features: ["tool-calling", "reasoning", "premium"],
  },

  // ========== OpenAI ==========
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "高速・低コスト、日常タスク向け",
    provider: "openai",
    features: ["fast", "tool-calling", "lightweight"],
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "マルチモーダル対応の最新モデル",
    provider: "openai",
    features: ["tool-calling", "vision", "multimodal"],
  },

  // ========== Google (Gemini) ==========
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "超高速・低コスト、最もお得",
    provider: "google",
    features: ["fast", "tool-calling", "multimodal", "recommended"],
  },
  {
    id: "google/gemini-2.5-flash-preview",
    name: "Gemini 2.5 Flash",
    description: "最新の高速モデル",
    provider: "google",
    features: ["fast", "tool-calling"],
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro",
    description: "長いコンテキスト、複雑なタスク向け",
    provider: "google",
    features: ["tool-calling", "reasoning", "long-context"],
  },

  // ========== xAI (Grok) ==========
  {
    id: "xai/grok-4-fast",
    name: "Grok 4 Fast",
    description: "高速応答、MCPツール呼び出しに最適化",
    provider: "xai",
    features: ["fast", "tool-calling"],
  },

  // ========== Reasoning Models (拡張思考) ==========
  {
    id: "anthropic/claude-sonnet-4-thinking",
    name: "Claude Sonnet 4 (推論)",
    description: "深い推論が必要な複雑な問題向け",
    provider: "reasoning",
    features: ["reasoning", "extended-thinking"],
  },
  {
    id: "xai/grok-4-reasoning",
    name: "Grok 4 推論",
    description: "コード最適化された推論モデル",
    provider: "reasoning",
    features: ["reasoning", "code"],
  },
];

// プロバイダー別にモデルをグループ化
export const getModelsByProvider = (
  provider: ChatModel["provider"],
): ChatModel[] => {
  return chatModels.filter((model) => model.provider === provider);
};

// モデルIDからモデル情報を取得
export const getModelById = (id: string): ChatModel | undefined => {
  return chatModels.find((model) => model.id === id);
};

// プロバイダー別にモデルをグループ化したオブジェクト
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
