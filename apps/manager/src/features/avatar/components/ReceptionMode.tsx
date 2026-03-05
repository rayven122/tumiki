"use client";

/**
 * 受付モード メインコンポーネント
 * AIカメラ＋音声認識＋VRMアバターによる企業受付・サポートセンターUI
 * 音声ファーストの円滑なコミュニケーションを実現
 *
 * 企業受付向け機能:
 * - アイドル自動リセット（2分無操作で新規セッション）
 * - 多言語対応（日本語/英語/中国語/韓国語）
 * - テキスト入力フォールバック
 * - クイックアクション（来訪受付・フロア案内・担当者呼出等）
 * - ステータスバー（マイク・カメラ・言語状態表示）
 * - ErrorBoundary（クラッシュ時自動復帰）
 * - キオスクモード（ブラウザナビゲーション防止）
 */

import { DefaultChatTransport } from "ai";
import type { ChatMessage } from "@/lib/types";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef, lazy, Suspense, useCallback } from "react";
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
import { useIdleReset } from "@/features/avatar/hooks/useIdleReset";
import { AvatarModeBackground } from "./AvatarModeBackground";
import { ReceptionCameraView } from "./ReceptionCameraView";
import { ReceptionVoiceButton } from "./ReceptionVoiceButton";
import { ReceptionMessages } from "./ReceptionMessages";
import { ReceptionNavigation } from "./ReceptionNavigation";
import { ReceptionStatusBar } from "./ReceptionStatusBar";
import { ReceptionQuickActions } from "./ReceptionQuickActions";
import { ReceptionTextInput } from "./ReceptionTextInput";
import { ReceptionLanguageSelector } from "./ReceptionLanguageSelector";
import { ReceptionErrorBoundary } from "./ReceptionErrorBoundary";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// 多言語ウェルカムメッセージ
const WELCOME_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  "ja-JP": { title: "いらっしゃいませ", subtitle: "ご用件をお聞かせください" },
  "en-US": {
    title: "Welcome",
    subtitle: "How may I assist you today?",
  },
  "zh-CN": { title: "欢迎光临", subtitle: "请问有什么可以帮您的？" },
  "ko-KR": { title: "어서 오세요", subtitle: "무엇을 도와드릴까요?" },
};

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
    <ReceptionErrorBoundary
      fallbackRedirect={`/${props.orgSlug}/reception`}
    >
      <CoharuProvider>
        <ReceptionModeContent {...props} />
      </CoharuProvider>
    </ReceptionErrorBoundary>
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
}: ReceptionModeProps) => {
  const { mutate } = useSWRConfig();
  const [input, setInput] = useState<string>("");
  const [isNewChat, setIsNewChat] = useState(initialIsNewChat);

  // 多言語対応
  const [currentLang, setCurrentLang] = useState("ja-JP");

  // カメラ・マイク状態追跡
  const [isMicActive, setIsMicActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Coharu コンテキスト
  const { speak, setIsEnabled, stopSpeaking } = useCoharuContext();

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

  // アイドル自動リセット（2分無操作で新規セッションへ）
  useIdleReset({
    timeout: 120_000,
    redirectTo: `/${orgSlug}/reception`,
    hasMessages: messages.length > 0,
    onBeforeReset: () => {
      stopSpeaking();
    },
  });

  // キオスクモード：ブラウザの戻る/進む操作を防止
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    // 初期状態をスタックに追加
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const isLoading = status === "streaming" || status === "submitted";

  // ウェルカムメッセージ表示（新規チャット時）
  const showWelcome = messages.length === 0 && !isLoading;

  const welcome = WELCOME_MESSAGES[currentLang] ?? WELCOME_MESSAGES["ja-JP"];

  // 言語変更ハンドラー
  const handleChangeLang = useCallback((lang: string) => {
    setCurrentLang(lang);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none">
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
        <ReceptionViewer messages={messages} status={status} />
      </Suspense>

      {/* z-20: カメラビュー（左下） */}
      <div className="fixed bottom-4 left-4 z-20">
        <ReceptionCameraView onStatusChange={setIsCameraActive} />
      </div>

      {/* z-20: ステータスバー（左上） */}
      <ReceptionStatusBar
        isMicActive={isMicActive}
        isCameraActive={isCameraActive}
        currentLang={currentLang}
      />

      {/* z-20: ウェルカム画面 */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[12%] z-20 flex flex-col items-center gap-6"
          >
            {/* 言語選択 */}
            <ReceptionLanguageSelector
              currentLang={currentLang}
              onChangeLang={handleChangeLang}
            />

            {/* ウェルカムメッセージ */}
            <div
              className={cn(
                "max-w-lg rounded-3xl px-8 py-6",
                "border border-white/20 bg-black/30 backdrop-blur-lg",
              )}
            >
              <p className="text-center text-xl leading-relaxed font-medium text-white">
                {welcome.title}
              </p>
              <p className="mt-2 text-center text-sm text-white/70">
                {welcome.subtitle}
              </p>
            </div>

            {/* クイックアクション */}
            <ReceptionQuickActions
              sendMessage={sendMessage}
              disabled={isLoading}
              chatId={id}
              orgSlug={orgSlug}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* z-20: 会話メッセージ（下部中央） */}
      <div className="fixed inset-x-0 bottom-36 z-20 mx-auto max-w-2xl px-4">
        <ReceptionMessages messages={messages} isLoading={isLoading} />
      </div>

      {/* z-20: 入力エリア（下部中央） */}
      <div className="fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-3">
        {/* 音声入力ボタン */}
        <ReceptionVoiceButton
          sendMessage={sendMessage}
          setInput={setInput}
          disabled={isLoading}
          chatId={id}
          orgSlug={orgSlug}
          lang={currentLang}
          onListeningChange={setIsMicActive}
        />

        {/* テキスト入力フォールバック */}
        <ReceptionTextInput
          sendMessage={sendMessage}
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
