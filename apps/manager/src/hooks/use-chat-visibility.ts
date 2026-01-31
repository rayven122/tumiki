"use client";

import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useParams } from "next/navigation";
import { updateChatVisibility } from "@/app/[orgSlug]/chat/actions";
import {
  getChatHistoryPaginationKey,
  type ChatHistory,
} from "@/components/sidebar-history";
import type { VisibilityType } from "@/components/visibility-selector";

type UseChatVisibilityReturn = {
  visibilityType: VisibilityType;
  setVisibilityType: (updatedVisibilityType: VisibilityType) => void;
};

export const useChatVisibility = ({
  chatId,
  initialVisibilityType,
  organizationId,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
  organizationId: string;
}): UseChatVisibilityReturn => {
  const { mutate, cache } = useSWRConfig();
  const history: ChatHistory = cache.get("/api/history")?.data;

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: initialVisibilityType,
    },
  );

  const visibilityType = useMemo((): VisibilityType => {
    if (!history) return localVisibility as VisibilityType;
    const chat = history.chats.find((chat) => chat.id === chatId);
    if (!chat) return "PRIVATE";
    return chat.visibility as VisibilityType;
  }, [history, chatId, localVisibility]);

  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    setLocalVisibility(updatedVisibilityType);
    mutate(unstable_serialize(getChatHistoryPaginationKey(organizationId)));

    updateChatVisibility({
      chatId: chatId,
      visibility: updatedVisibilityType,
    });
  };

  return { visibilityType, setVisibilityType };
};
