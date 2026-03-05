"use client";

/**
 * 受付モード ステータスバー
 * マイク・カメラ・接続状態をアイコンで表示
 */

import { Mic, MicOff, Camera, CameraOff, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ReceptionStatusBarProps = {
  isMicActive: boolean;
  isCameraActive: boolean;
  /** 現在の言語コード */
  currentLang: string;
};

export const ReceptionStatusBar = ({
  isMicActive,
  isCameraActive,
  currentLang,
}: ReceptionStatusBarProps) => {
  // 言語コードを表示名に変換
  const langLabel: Record<string, string> = {
    "ja-JP": "日本語",
    "en-US": "English",
    "zh-CN": "中文",
    "ko-KR": "한국어",
  };

  return (
    <div className="fixed top-4 left-4 z-30 flex items-center gap-3">
      {/* 言語表示 */}
      <div
        className={cn(
          "rounded-full px-3 py-1.5",
          "border border-white/20 bg-black/30 backdrop-blur-md",
          "text-xs text-white/80",
        )}
      >
        {langLabel[currentLang] ?? currentLang}
      </div>

      {/* マイク状態 */}
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          "border backdrop-blur-md",
          isMicActive
            ? "border-green-400/40 bg-green-500/20"
            : "border-white/20 bg-black/30",
        )}
        title={isMicActive ? "マイク: ON" : "マイク: OFF"}
      >
        {isMicActive ? (
          <Mic className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <MicOff className="h-3.5 w-3.5 text-white/50" />
        )}
      </div>

      {/* カメラ状態 */}
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          "border backdrop-blur-md",
          isCameraActive
            ? "border-green-400/40 bg-green-500/20"
            : "border-white/20 bg-black/30",
        )}
        title={isCameraActive ? "カメラ: ON" : "カメラ: OFF"}
      >
        {isCameraActive ? (
          <Camera className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <CameraOff className="h-3.5 w-3.5 text-white/50" />
        )}
      </div>
    </div>
  );
};
