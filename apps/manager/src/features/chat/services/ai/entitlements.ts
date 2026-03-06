import { chatModels, type ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel["id"]>;
};

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
    // chatModels から全てのモデルIDを取得
    availableChatModelIds: chatModels.map((model) => model.id),
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
