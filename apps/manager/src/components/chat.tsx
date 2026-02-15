"use client";

import { DefaultChatTransport } from "ai";
import type { AgentInfo, Attachment, ChatMessage } from "@/lib/types";
import { useChat } from "@ai-sdk/react";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  lazy,
  Suspense,
} from "react";
import { useSWRConfig } from "swr";
import { ChatQuickActions } from "@/features/chat";
import { SuggestedActions } from "./suggested-actions";
import { fetchWithErrorHandlers, generateCUID } from "@/lib/utils";
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
import { CoharuProvider, useCoharuContext } from "@/features/avatar/hooks";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import { getProxyServerUrl } from "@/lib/url";

// CoharuViewer を動的インポート（Three.js のバンドルサイズ最適化）
const CoharuViewer = lazy(() =>
  import("@/features/avatar/components/CoharuViewer").then((mod) => ({
    default: mod.CoharuViewer,
  })),
);

type ChatProps = {
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
  agentInfo?: AgentInfo;
};

export function Chat(props: ChatProps) {
  return (
    <CoharuProvider>
      <ChatContent {...props} />
    </CoharuProvider>
  );
}

function ChatContent({
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
  agentInfo,
}: ChatProps) {
  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();
  const [input, setInput] = useState<string>("");

  // Coharu コンテキスト
  const {
    isEnabled: isCoharuEnabled,
    isSpeaking,
    speak,
    stopSpeaking,
  } = useCoharuContext();

  // Coharu の状態を ref で保持（useChat のコールバック内で最新値を参照するため）
  const isCoharuEnabledRef = useRef(isCoharuEnabled);
  const speakRef = useRef(speak);

  // ref を最新の値で更新
  useEffect(() => {
    isCoharuEnabledRef.current = isCoharuEnabled;
  }, [isCoharuEnabled]);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // MCPサーバーIDsを ref で保持（useChat のコールバック内で最新値を参照するため）
  const selectedMcpServerIdsRef = useRef<string[]>([]);

  // ストリーミング中のTTS用状態
  // 蓄積中のテキスト
  const streamingTextRef = useRef<string>("");
  // 読み上げ済みのインデックス
  const spokenIndexRef = useRef<number>(0);

  // チャット設定をLocalStorageから取得・保存
  const {
    chatModel: storedChatModel,
    setChatModel: setStoredChatModel,
    mcpServerIds: storedMcpServerIds,
    setMcpServerIds: setStoredMcpServerIds,
  } = useChatPreferences({ organizationId });

  // 既存チャットのモデル変更用ローカル状態（LocalStorageには保存しない）
  const [localChatModel, setLocalChatModel] = useState(initialChatModel);

  // 新規チャットの場合はLocalStorageの値を使用、既存チャットの場合はローカル状態を使用
  const selectedChatModel = isNewChat ? storedChatModel : localChatModel;
  // MCPサーバーは新規チャットのみ変更可能（既存チャットはinitialMcpServerIdsを使用）
  const selectedMcpServerIds = isNewChat
    ? storedMcpServerIds
    : initialMcpServerIds;

  // ref を最新の値で更新（useChat のコールバック内で最新値を参照するため）
  useEffect(() => {
    selectedMcpServerIdsRef.current = selectedMcpServerIds;
  }, [selectedMcpServerIds]);

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
    organizationId,
  });

  // mcp-proxy の URL を取得
  const mcpProxyUrl = getProxyServerUrl();

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
      api: `${mcpProxyUrl}/chat`,
      fetch: (url, options) => {
        // mcp-proxy への認証ヘッダーを追加
        const headers = new Headers(options?.headers);
        if (session.accessToken) {
          headers.set("Authorization", `Bearer ${session.accessToken}`);
        }
        return fetchWithErrorHandlers(url, {
          ...options,
          headers,
        });
      },
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);

        return {
          body: {
            id: request.id,
            organizationId,
            message: lastMessage,
            selectedChatModel,
            selectedVisibilityType: visibilityType,
            selectedMcpServerIds: selectedMcpServerIdsRef.current,
            isCoharuEnabled: isCoharuEnabledRef.current,
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

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // Coharu TTS: messages を監視してストリーミング中のテキストを読み上げ
  // 前回の status を追跡して、ストリーミング完了を検出
  const prevStatusRef = useRef(status);

  useEffect(() => {
    // Coharu が無効な場合は何もしない
    if (!isCoharuEnabledRef.current) {
      return;
    }

    // 最後のアシスタントメッセージを取得
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }

    // メッセージからテキストを抽出
    const currentText = lastMessage.parts
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )
      .map((part) => part.text)
      .join("");

    // ストリーミング中の場合、文単位で読み上げ
    if (status === "streaming") {
      streamingTextRef.current = currentText;

      // 文の区切り文字（。！？）で分割して読み上げ
      const sentenceEndRegex = /[。！？!?]/g;
      let lastIndex = spokenIndexRef.current;
      let match: RegExpExecArray | null;

      while ((match = sentenceEndRegex.exec(currentText)) !== null) {
        if (match.index >= spokenIndexRef.current) {
          const sentence = currentText.slice(lastIndex, match.index + 1).trim();
          if (sentence) {
            void speakRef.current(sentence);
          }
          lastIndex = match.index + 1;
          spokenIndexRef.current = lastIndex;
        }
      }
    }

    // ストリーミングが完了した場合（streaming → ready）、残りのテキストを読み上げ
    if (prevStatusRef.current === "streaming" && status === "ready") {
      const remainingText = streamingTextRef.current
        .slice(spokenIndexRef.current)
        .trim();
      if (remainingText) {
        void speakRef.current(remainingText);
      }

      // ref をリセット
      streamingTextRef.current = "";
      spokenIndexRef.current = 0;
    }

    prevStatusRef.current = status;
  }, [messages, status]);

  // チャットモデル変更ハンドラ
  // 新規チャット: LocalStorageに保存
  // 既存チャット: ローカル状態のみ更新（LocalStorageには保存しない）
  const handleModelChange = useCallback(
    (modelId: string) => {
      if (isNewChat) {
        setStoredChatModel(modelId);
      } else {
        setLocalChatModel(modelId);
      }
    },
    [isNewChat, setStoredChatModel],
  );

  // MCPサーバー選択変更ハンドラ（新規チャットのみ変更可能）
  // 注意: 既存チャットでは UI 側で disabled にしているため、この関数は新規チャット時のみ呼ばれる
  const handleMcpServerSelectionChange = useCallback(
    (ids: string[]) => {
      if (isNewChat) {
        setStoredMcpServerIds(ids);
      }
    },
    [isNewChat, setStoredMcpServerIds],
  );

  // 初回チャット（メッセージがない状態）かどうか
  const isEmptyChat = messages.length === 0;

  return (
    <>
      <div className="relative flex h-full w-full">
        {/* チャットエリア */}
        <div className="bg-background flex min-w-0 flex-1 flex-col">
          {/* 初回チャット時は中央配置、メッセージがある場合は通常表示 */}
          {isEmptyChat ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              {/* 挨拶メッセージ */}
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-medium md:text-3xl">
                  <span className="mr-2">👋</span>
                  こんにちは
                </h1>
              </div>

              {/* 入力フォーム（中央配置） */}
              <div className="w-full max-w-3xl">
                {!isReadonly && (
                  <>
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
                      isSpeaking={isSpeaking}
                      stopSpeaking={stopSpeaking}
                      session={session}
                      selectedModelId={selectedChatModel}
                      onModelChange={handleModelChange}
                      selectedMcpServerIds={selectedMcpServerIds}
                      onMcpServerSelectionChange={
                        handleMcpServerSelectionChange
                      }
                      isNewChat={isNewChat}
                    />

                    {/* クイックアクション */}
                    <div className="mt-4">
                      <ChatQuickActions
                        chatId={id}
                        organizationId={organizationId}
                        isPersonalOrg={isPersonalOrg}
                        selectedVisibilityType={initialVisibilityType}
                        isNewChat={isNewChat}
                        isReadonly={isReadonly}
                      />
                    </div>

                    {/* サジェスト */}
                    <div className="mt-6">
                      <SuggestedActions
                        chatId={id}
                        orgSlug={orgSlug}
                        sendMessage={sendMessage}
                        selectedVisibilityType={visibilityType}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <Messages
                chatId={id}
                status={status}
                messages={messages}
                setMessages={setMessages}
                regenerate={regenerate}
                isReadonly={isReadonly}
                isArtifactVisible={isArtifactVisible}
                agentInfo={agentInfo}
              />

              <form className="bg-background mx-auto flex w-full flex-col gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
                {!isReadonly && (
                  <>
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
                      isSpeaking={isSpeaking}
                      stopSpeaking={stopSpeaking}
                      session={session}
                      selectedModelId={selectedChatModel}
                      onModelChange={handleModelChange}
                      selectedMcpServerIds={selectedMcpServerIds}
                      onMcpServerSelectionChange={
                        handleMcpServerSelectionChange
                      }
                      isNewChat={false}
                    />

                    {/* クイックアクション */}
                    <ChatQuickActions
                      chatId={id}
                      organizationId={organizationId}
                      isPersonalOrg={isPersonalOrg}
                      selectedVisibilityType={initialVisibilityType}
                      isNewChat={false}
                      isReadonly={isReadonly}
                    />
                  </>
                )}
              </form>
            </>
          )}
        </div>

        {/* Coharu VRM エリア - 右下に固定配置 */}
        {isCoharuEnabled && (
          <div className="fixed right-8 bottom-32 z-[100]">
            <Suspense
              fallback={
                <div className="flex h-64 w-52 items-center justify-center">
                  <div className="text-muted-foreground text-sm">
                    読み込み中...
                  </div>
                </div>
              }
            >
              <CoharuViewer />
            </Suspense>
          </div>
        )}
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
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
