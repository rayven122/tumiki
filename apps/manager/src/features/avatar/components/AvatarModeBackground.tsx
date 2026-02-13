"use client";

/**
 * アバターモード背景コンポーネント
 * フルスクリーン背景画像を表示（画像がない場合はグラデーション）
 */

import { useState } from "react";
import { useAtomValue } from "jotai";
import {
  avatarModeBackgroundAtom,
  BACKGROUND_IMAGES,
} from "@/store/avatarMode";

export const AvatarModeBackground = () => {
  const backgroundType = useAtomValue(avatarModeBackgroundAtom);
  const backgroundSrc = BACKGROUND_IMAGES[backgroundType];
  const [imageError, setImageError] = useState(false);

  return (
    <div className="absolute inset-0 z-0">
      {/* フォールバック: サイバーパンク風グラデーション背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-slate-900 to-cyan-900" />

      {/* 背景画像（存在する場合）- 標準imgタグで最適化を回避 */}
      {!imageError && (
        <img
          src={backgroundSrc}
          alt="アバターモード背景"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* 背景を少し暗くするオーバーレイ */}
      <div className="absolute inset-0 bg-black/20" />

      {/* サイバーパンク風の装飾グリッド（画像がない場合） */}
      {imageError && (
        <div className="absolute inset-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />
        </div>
      )}
    </div>
  );
};
