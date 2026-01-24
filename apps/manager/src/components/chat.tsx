"use client";

import { DefaultChatTransport } from "ai";
import type { Attachment, ChatMessage } from "@/lib/types";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChatHeader } from "@/components/chat-header";
import type { Vote } from "@tumiki/db/prisma";
import { fetcher, fetchWithErrorHandlers, generateCUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { MultimodalInput } from "./multimodal-input";
import { Messages } from "./messages";
import type { VisibilityType } from "./visibility-selector";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { unstable_serialize } from "swr/infinite";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import { useSearchParams } from "next/navigation";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { ChatSDKError } from "@/lib/errors";
import type { SessionData } from "~/auth";
import { useDataStream } from "./data-stream-provider";

export function Chat({
  id,
  organizationId,
  orgSlug,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  initialMcpServerIds,
  isReadonly,
  session,
  autoResume,
  isPersonalOrg,
  isNewChat = false,
}: {
  id: string;
  organizationId: string;
  orgSlug: string;
  initialMessages: Array<ChatMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  initialMcpServerIds: string[];
  isReadonly: boolean;
  session: SessionData;
  autoResume: boolean;
  isPersonalOrg: boolean;
  isNewChat?: boolean;
}) {
  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();
  const [selectedChatModel, setSelectedChatModel] = useState(initialChatModel);
  const [input, setInput] = useState<string>("");

  // MCPサーバーIDを状態で管理（チャット中の変更に対応）
  const [selectedMcpServerIds, setSelectedMcpServerIds] =
    useState<string[]>(initialMcpServerIds);

  // useRef で最新値を保持（prepareSendMessagesRequest のクロージャ問題を回避）
  const mcpServerIdsRef = useRef(selectedMcpServerIds);
  useEffect(() => {
    mcpServerIdsRef.current = selectedMcpServerIds;
  }, [selectedMcpServerIds]);

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
    organizationId,
  });

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateCUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);

        return {
          body: {
            id: request.id,
            organizationId,
            message: lastMessage,
            selectedChatModel,
            selectedVisibilityType: visibilityType,
            // useRef経由で最新のMCPサーバーIDを参照
            selectedMcpServerIds: mcpServerIdsRef.current,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey(organizationId)));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: "error",
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/${orgSlug}/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id, orgSlug]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // MCPサーバー選択変更ハンドラ（新規チャットのみ変更可能）
  // 注意: 既存チャットでは UI 側で disabled にしているため、この関数は新規チャット時のみ呼ばれる
  const handleMcpServerSelectionChange = useCallback((ids: string[]) => {
    setSelectedMcpServerIds(ids);
    // Cookie への保存は McpServerSelector 内で行われる
  }, []);

  return (
    <>
      <div className="bg-background flex h-full min-w-0 flex-col">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          onModelChange={setSelectedChatModel}
          selectedVisibilityType={initialVisibilityType}
          selectedMcpServerIds={selectedMcpServerIds}
          onMcpServerSelectionChange={handleMcpServerSelectionChange}
          isReadonly={isReadonly}
          session={session}
          organizationId={organizationId}
          isPersonalOrg={isPersonalOrg}
          isNewChat={isNewChat && messages.length === 0}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              orgSlug={orgSlug}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        orgSlug={orgSlug}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
