export const DEFAULT_CHAT_MODEL: string = "chat-model";

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model",
    name: "Chat model",
    description: "Primary model for all-purpose chat",
  },
  {
    id: "chat-model-reasoning",
    name: "Reasoning model",
    description: "Uses advanced reasoning",
  },
];

// Export model instances for provider configuration
export const chatModel = "chat-model";
export const reasoningModel = "chat-model-reasoning";
export const titleModel = "title-model";
export const artifactModel = "artifact-model";
