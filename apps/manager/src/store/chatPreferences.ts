import { atomWithStorage } from "jotai/utils";
import { AUTO_MODEL_ID } from "@/features/chat/services/ai/auto-model-selector";

export type ChatPreferences = {
  model: string; // 共通設定（"auto" または具体的なモデルID）
  mcpServerIdsByOrg: Record<string, string[]>; // 組織ごとのMCPサーバーIDs
  personaId: string | undefined; // 選択中のペルソナID（undefined = デフォルト）
};

const defaultPreferences: ChatPreferences = {
  model: AUTO_MODEL_ID, // デフォルトは自動選択
  mcpServerIdsByOrg: {},
  personaId: undefined,
};

export const chatPreferencesAtom = atomWithStorage<ChatPreferences>(
  "chat-preferences",
  defaultPreferences,
);
