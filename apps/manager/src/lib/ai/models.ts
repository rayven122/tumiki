export const DEFAULT_CHAT_MODEL: string = "grok-4-fast";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider: "xai" | "anthropic" | "openai" | "google";
  features?: string[];
};

// MCPクライアントとして利用可能なモデル（ツール呼び出し対応）
export const chatModels: Array<ChatModel> = [
  // ========== xAI (Grok) ==========
  // {
  //   id: "grok-4-fast",
  //   name: "Grok 4 Fast",
  //   description: "高速応答、MCPツール呼び出しに最適化",
  //   provider: "xai",
  //   features: ["fast", "tool-calling"],
  // },
  // {
  //   id: "grok-4-reasoning",
  //   name: "Grok 4 推論",
  //   description: "深い推論が必要な複雑なタスク向け",
  //   provider: "xai",
  //   features: ["reasoning", "tool-calling"],
  // },
  // {
  //   id: "grok-4-vision",
  //   name: "Grok 4 Vision",
  //   description: "画像認識・分析対応",
  //   provider: "xai",
  //   features: ["vision", "multimodal"],
  // },
  // {
  //   id: "grok-3-mini",
  //   name: "Grok 3 Mini",
  //   description: "軽量・高速、シンプルなタスク向け",
  //   provider: "xai",
  //   features: ["fast", "lightweight"],
  // },

  // ========== Anthropic (Claude) ==========
  {
    id: "claude-sonnet-4",
    name: "Claude 4 Sonnet",
    description: "バランスの取れた高性能モデル",
    provider: "anthropic",
    features: ["tool-calling", "reasoning"],
  },
  {
    id: "claude-opus-4",
    name: "Claude 4 Opus",
    description: "最高精度、複雑なタスク向け",
    provider: "anthropic",
    features: ["tool-calling", "reasoning", "premium"],
  },
  {
    id: "claude-haiku-3.5",
    name: "Claude 3.5 Haiku",
    description: "高速・低コスト、シンプルなタスク向け",
    provider: "anthropic",
    features: ["fast", "tool-calling", "lightweight"],
  },

  // ========== OpenAI ==========
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "マルチモーダル対応の最新モデル",
    provider: "openai",
    features: ["tool-calling", "vision", "multimodal"],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "高速・低コスト、日常タスク向け",
    provider: "openai",
    features: ["fast", "tool-calling", "lightweight"],
  },
  // {
  //   id: "o1",
  //   name: "o1",
  //   description: "高度な推論能力を持つモデル",
  //   provider: "openai",
  //   features: ["reasoning", "tool-calling"],
  // },
  // {
  //   id: "o3-mini",
  //   name: "o3 Mini",
  //   description: "推論特化の軽量モデル",
  //   provider: "openai",
  //   features: ["reasoning", "fast", "lightweight"],
  // },

  // ========== Google (Gemini) ==========
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "高速・マルチモーダル対応",
    provider: "google",
    features: ["fast", "tool-calling", "multimodal"],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "長いコンテキスト、複雑なタスク向け",
    provider: "google",
    features: ["tool-calling", "reasoning", "long-context"],
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "最新の高速モデル",
    provider: "google",
    features: ["fast", "tool-calling"],
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
