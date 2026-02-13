import { atomWithStorage } from "jotai/utils";
import { DEFAULT_CHAT_MODEL } from "@/features/chat/services/ai/index.client";

export type ChatPreferences = {
  model: string; // 共通設定
  mcpServerIdsByOrg: Record<string, string[]>; // 組織ごとのMCPサーバーIDs
};

const defaultPreferences: ChatPreferences = {
  model: DEFAULT_CHAT_MODEL,
  mcpServerIdsByOrg: {},
};

export const chatPreferencesAtom = atomWithStorage<ChatPreferences>(
  "chat-preferences",
  defaultPreferences,
);
