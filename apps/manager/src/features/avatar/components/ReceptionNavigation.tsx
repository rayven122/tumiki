"use client";

/**
 * 受付モード ナビゲーションコンポーネント
 * 最小限のナビゲーション（受付向け）
 */

import Link from "next/link";
import { Home, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoharuContext } from "@/features/avatar/hooks/useCoharuContext";

type ReceptionNavigationProps = {
  orgSlug: string;
};

export const ReceptionNavigation = ({
  orgSlug,
}: ReceptionNavigationProps) => {
  const { isSpeaking, stopSpeaking } = useCoharuContext();

  return (
    <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
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

      {/* ホームへ戻る */}
      <Link
        href={`/${orgSlug}/chat`}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2",
          "border border-white/30 bg-white/20 shadow-sm backdrop-blur-md",
          "text-sm text-white transition-all hover:bg-white/30",
        )}
      >
        <Home className="h-4 w-4" />
      </Link>
    </div>
  );
};
