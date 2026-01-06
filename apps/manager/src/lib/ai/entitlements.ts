import type { ChatModel } from "./models";

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel["id"]>;
}

export const entitlementsByUserType: Record<"regular", Entitlements> = {
  /*
   * For users without an account
   */
  // guest: {
  //   maxMessagesPerDay: 20,
  //   availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  // },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      // xAI (Grok)
      "grok-4-fast",
      "grok-4-reasoning",
      "grok-4-vision",
      "grok-3-mini",
      // Anthropic (Claude)
      "claude-sonnet-4",
      "claude-opus-4",
      "claude-haiku-3.5",
      // OpenAI
      "gpt-4o",
      "gpt-4o-mini",
      "o1",
      "o3-mini",
      // Google (Gemini)
      "gemini-2.0-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
