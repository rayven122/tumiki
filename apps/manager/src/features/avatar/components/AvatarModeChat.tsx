"use client";

/**
 * アバターモード メインコンポーネント
 * フルスクリーンでVRMアバターとチャットを表示
 */

import { DefaultChatTransport } from "ai";
import type { ChatMessage } from "@/lib/types";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useSWRConfig } from "swr";
import { fetchWithErrorHandlers, generateCUID } from "@/lib/utils";
import { unstable_serialize } from "swr/infinite";
import { getChatHistoryPaginationKey } from "@/components/sidebar-history";
import { toast } from "@/components/toast";
import { ChatSDKError } from "@/lib/errors";
import {
  CoharuProvider,
  useCoharuContext,
} from "@/features/avatar/hooks/useCoharuContext";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import { useTTSHandler } from "@/features/avatar/hooks/useTTSHandler";
import { AvatarModeBackground } from "./AvatarModeBackground";
import { AvatarModeChatPanel } from "./AvatarModeChatPanel";
import { AvatarModeQuickReplies } from "./AvatarModeQuickReplies";
import { AvatarModeNavigation } from "./AvatarModeNavigation";
import { Loader2 } from "lucide-react";

// AvatarModeViewer を動的インポート（Three.js のバンドルサイズ最適化）
const AvatarModeViewer = lazy(() =>
  import("./AvatarModeViewer").then((mod) => ({
    default: mod.AvatarModeViewer,
  })),
);

type AvatarModeChatProps = {
  id: string;
  organizationId: string;
  orgSlug: string;
  initialMessages: Array<ChatMessage>;
  initialChatModel: string;
  initialMcpServerIds: string[];
  isNewChat?: boolean;
  currentUserId: string;
};

export const AvatarModeChat = (props: AvatarModeChatProps) => {
  return (
    <CoharuProvider>
      <AvatarModeChatContent {...props} />
    </CoharuProvider>
  );
};

const AvatarModeChatContent = ({
  id,
  organizationId,
  orgSlug,
  initialMessages,
  initialChatModel,
  initialMcpServerIds,
  isNewChat: initialIsNewChat = false,
  currentUserId,
}: AvatarModeChatProps) => {
  const { mutate } = useSWRConfig();
  const [input, setInput] = useState<string>("");

  // isNewChat をローカル状態で管理（メッセージ送信後に false に更新）
  const [isNewChat, setIsNewChat] = useState(initialIsNewChat);

  // Coharu コンテキスト
  const { speak, setIsEnabled } = useCoharuContext();

  // アバターモードでは常に Coharu を有効にする
  useEffect(() => {
    setIsEnabled(true);
  }, [setIsEnabled]);

  // MCPサーバーIDsを ref で保持
  const selectedMcpServerIdsRef = useRef<string[]>([]);

  // チャット設定をLocalStorageから取得
  const {
    chatModel: storedChatModel,
    mcpServerIds: storedMcpServerIds,
    setMcpServerIds,
  } = useChatPreferences({ organizationId });

  // 既存チャットのモデル変更用ローカル状態
  const [localChatModel] = useState(initialChatModel);

  // 新規チャットの場合はLocalStorageの値を使用
  const selectedChatModel = isNewChat ? storedChatModel : localChatModel;
  const selectedMcpServerIds = isNewChat
    ? storedMcpServerIds
    : initialMcpServerIds;

  // ref を最新の値で更新
  useEffect(() => {
    selectedMcpServerIdsRef.current = selectedMcpServerIds;
  }, [selectedMcpServerIds]);

  const { messages, sendMessage, status, stop } = useChat<ChatMessage>({
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
            selectedVisibilityType: "PRIVATE",
            selectedMcpServerIds: selectedMcpServerIdsRef.current,
            isCoharuEnabled: true, // アバターモードでは常に有効
            ...request.body,
          },
        };
      },
    }),
    onFinish: () => {
      void mutate(
        unstable_serialize(getChatHistoryPaginationKey(organizationId)),
      );
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

  // メッセージが追加されたら isNewChat を false に更新
  useEffect(() => {
    if (messages.length > 0 && isNewChat) {
      setIsNewChat(false);
    }
  }, [messages.length, isNewChat]);

  // TTS処理（カスタムフックに分離）
  useTTSHandler({ messages, status, speak });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* z-0: 背景画像 */}
      <AvatarModeBackground />

      {/* z-10: VRM アバター */}
      <Suspense
        fallback={
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">読み込み中...</span>
            </div>
          </div>
        }
      >
        <AvatarModeViewer />
      </Suspense>

      {/* z-20: チャットパネル */}
      <AvatarModeChatPanel
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        status={status}
        stop={stop}
        selectedMcpServerIds={selectedMcpServerIds}
        onMcpServerSelectionChange={isNewChat ? setMcpServerIds : undefined}
        isNewChat={isNewChat}
        chatId={id}
        orgSlug={orgSlug}
      />

      {/* z-20: クイックリプライ */}
      <AvatarModeQuickReplies
        sendMessage={sendMessage}
        setInput={setInput}
        disabled={isLoading}
        chatId={id}
        orgSlug={orgSlug}
      />

      {/* z-20: ナビゲーション */}
      <AvatarModeNavigation
        orgSlug={orgSlug}
        chatId={isNewChat ? undefined : id}
        organizationId={organizationId}
        currentUserId={currentUserId}
        isNewChat={isNewChat}
      />
    </div>
  );
};
