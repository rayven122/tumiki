"use client";

/**
 * 受付モード メインコンポーネント
 * AIカメラ＋音声認識＋VRMアバターによる受付・サポートセンターUI
 * 音声ファーストの円滑なコミュニケーションを実現
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
import { ReceptionCameraView } from "./ReceptionCameraView";
import { ReceptionVoiceButton } from "./ReceptionVoiceButton";
import { ReceptionMessages } from "./ReceptionMessages";
import { ReceptionNavigation } from "./ReceptionNavigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ReceptionViewer を動的インポート（Three.js のバンドルサイズ最適化）
const ReceptionViewer = lazy(() =>
  import("./ReceptionViewer").then((mod) => ({
    default: mod.ReceptionViewer,
  })),
);

type ReceptionModeProps = {
  id: string;
  organizationId: string;
  orgSlug: string;
  initialMessages: Array<ChatMessage>;
  initialChatModel: string;
  initialMcpServerIds: string[];
  isNewChat?: boolean;
  currentUserId: string;
};

export const ReceptionMode = (props: ReceptionModeProps) => {
  return (
    <CoharuProvider>
      <ReceptionModeContent {...props} />
    </CoharuProvider>
  );
};

const ReceptionModeContent = ({
  id,
  organizationId,
  orgSlug,
  initialMessages,
  initialChatModel,
  initialMcpServerIds,
  isNewChat: initialIsNewChat = false,
  currentUserId,
}: ReceptionModeProps) => {
  const { mutate } = useSWRConfig();
  const [input, setInput] = useState<string>("");
  const [isNewChat, setIsNewChat] = useState(initialIsNewChat);

  // Coharu コンテキスト
  const { speak, setIsEnabled } = useCoharuContext();

  // 受付モードでは常に Coharu を有効にする
  useEffect(() => {
    setIsEnabled(true);
  }, [setIsEnabled]);

  // MCPサーバーIDsを ref で保持
  const selectedMcpServerIdsRef = useRef<string[]>([]);

  // チャット設定をLocalStorageから取得
  const {
    chatModel: storedChatModel,
    mcpServerIds: storedMcpServerIds,
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

  const { messages, sendMessage, status } = useChat<ChatMessage>({
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
            isCoharuEnabled: true,
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

  // ウェルカムメッセージ表示（新規チャット時）
  const showWelcome = messages.length === 0 && !isLoading;

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
        <ReceptionViewer messages={messages} />
      </Suspense>

      {/* z-20: カメラビュー（左下） */}
      <div className="fixed bottom-4 left-4 z-20">
        <ReceptionCameraView />
      </div>

      {/* z-20: ウェルカムメッセージ */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[20%] z-20 flex justify-center"
          >
            <div
              className={cn(
                "max-w-lg rounded-3xl px-8 py-6",
                "border border-white/20 bg-black/30 backdrop-blur-lg",
              )}
            >
              <p className="text-center text-xl leading-relaxed font-medium text-white">
                いらっしゃいませ
              </p>
              <p className="mt-2 text-center text-sm text-white/70">
                ご用件をお聞かせください
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* z-20: 会話メッセージ（下部中央） */}
      <div className="fixed inset-x-0 bottom-32 z-20 mx-auto max-w-2xl">
        <ReceptionMessages messages={messages} isLoading={isLoading} />
      </div>

      {/* z-20: 音声入力ボタン（下部中央） */}
      <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center">
        <ReceptionVoiceButton
          sendMessage={sendMessage}
          setInput={setInput}
          disabled={isLoading}
          chatId={id}
          orgSlug={orgSlug}
        />
      </div>

      {/* z-30: ナビゲーション */}
      <ReceptionNavigation orgSlug={orgSlug} />
    </div>
  );
};
