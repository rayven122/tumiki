"use client";

/**
 * アバターモード用ナビゲーションコンポーネント
 * 右上に配置されるナビゲーションボタン
 */

import Link from "next/link";
import { Home, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoharuContext } from "@/features/avatar/hooks/useCoharuContext";
import { ChatHistoryDropdown } from "@/app/[orgSlug]/_components/ChatHistoryDropdown";

type AvatarModeNavigationProps = {
  orgSlug: string;
  chatId?: string;
  organizationId: string;
  currentUserId: string;
  isNewChat?: boolean;
};

export const AvatarModeNavigation = ({
  orgSlug,
  chatId,
  organizationId,
  currentUserId,
  isNewChat = false,
}: AvatarModeNavigationProps) => {
  const { isSpeaking, stopSpeaking } = useCoharuContext();

  return (
    <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
      {/* 音声停止ボタン（話している時のみ表示） */}
      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2",
            "border border-red-300/50 bg-red-500/70 shadow-sm backdrop-blur-md",
            "text-sm text-white transition-all hover:bg-red-600/80",
          )}
          aria-label="音声を停止"
        >
          <VolumeX className="h-4 w-4" />
          <span>停止</span>
        </button>
      )}

      {/* チャット履歴（アバターモード用） */}
      <div
        className={cn(
          "rounded-full",
          "border border-white/30 bg-white/70 shadow-sm backdrop-blur-md",
          "[&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none",
        )}
      >
        <ChatHistoryDropdown
          chatId={chatId ?? ""}
          orgSlug={orgSlug}
          organizationId={organizationId}
          currentUserId={currentUserId}
          isNewChat={isNewChat}
          avatarMode={true}
        />
      </div>

      {/* ホームへ戻る */}
      <Link
        href={`/${orgSlug}/chat`}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2",
          "border border-white/30 bg-white/70 shadow-sm backdrop-blur-md",
          "text-sm text-gray-800 transition-all hover:bg-white/90",
        )}
      >
        <Home className="h-4 w-4" />
        <span>ホーム</span>
      </Link>
    </div>
  );
};
