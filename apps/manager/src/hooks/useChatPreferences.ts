"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import { chatPreferencesAtom } from "@/store/chatPreferences";

type UseChatPreferencesProps = {
  organizationId: string;
};

type UseChatPreferencesReturn = {
  chatModel: string;
  setChatModel: (model: string) => void;
  mcpServerIds: string[];
  setMcpServerIds: (ids: string[]) => void;
  personaId: string | undefined;
  setPersonaId: (id: string | undefined) => void;
};

// チャット設定を管理するカスタムフック
// モデルは共通、MCPサーバーIDsは組織ごと
export const useChatPreferences = ({
  organizationId,
}: UseChatPreferencesProps): UseChatPreferencesReturn => {
  const [preferences, setPreferences] = useAtom(chatPreferencesAtom);

  const setChatModel = useCallback(
    (model: string) => {
      setPreferences((prev) => ({ ...prev, model }));
    },
    [setPreferences],
  );

  const setMcpServerIds = useCallback(
    (mcpServerIds: string[]) => {
      setPreferences((prev) => ({
        ...prev,
        mcpServerIdsByOrg: {
          ...prev.mcpServerIdsByOrg,
          [organizationId]: mcpServerIds,
        },
      }));
    },
    [setPreferences, organizationId],
  );

  const setPersonaId = useCallback(
    (personaId: string | undefined) => {
      setPreferences((prev) => ({ ...prev, personaId }));
    },
    [setPreferences],
  );

  return {
    chatModel: preferences.model,
    setChatModel,
    mcpServerIds: preferences.mcpServerIdsByOrg[organizationId] ?? [],
    setMcpServerIds,
    personaId: preferences.personaId,
    setPersonaId,
  };
};
