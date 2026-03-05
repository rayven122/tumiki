"use client";

/**
 * アニメーション管理フック
 * VRM アバターのアニメーション再生を管理
 * 会話連動ジェスチャーの優先再生をサポート
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { VRMAAnimationManager } from "@/features/avatar/services/VRMAAnimationManager";
import { getAvailableVrmaPaths } from "@/features/avatar/utils";

type AnimationManagerResult = {
  update: (deltaTime: number) => void;
  hasAnimations: boolean;
  /** 指定インデックスのアニメーションを優先再生 */
  playGesture: (index: number) => void;
  /** 読み込み済みアニメーション数 */
  clipCount: number;
};

export const useAnimationManager = (
  vrm: VRM | null,
): AnimationManagerResult => {
  const managerRef = useRef<VRMAAnimationManager | null>(null);
  const [hasAnimations, setHasAnimations] = useState(false);
  const [clipCount, setClipCount] = useState(0);

  // アニメーションマネージャーの初期化と連続ランダムアニメーション開始
  useEffect(() => {
    if (!vrm) {
      managerRef.current?.dispose();
      managerRef.current = null;
      setHasAnimations(false);
      setClipCount(0);
      return;
    }

    // 利用可能なアニメーションパスを取得してから初期化
    const initManager = async () => {
      const availablePaths = await getAvailableVrmaPaths();
      setHasAnimations(availablePaths.length > 0);

      const manager = new VRMAAnimationManager(vrm, availablePaths);
      managerRef.current = manager;

      // 連続ランダムアニメーション開始
      await manager.startContinuousRandomAnimations();

      setClipCount(manager.getClipCount());
    };

    void initManager();

    return () => {
      managerRef.current?.dispose();
    };
  }, [vrm]);

  const update = useCallback((_deltaTime: number) => {
    managerRef.current?.update();
  }, []);

  // 指定インデックスのアニメーションを優先再生
  const playGesture = useCallback((index: number) => {
    managerRef.current?.playAnimationByIndex(index, true, 0.2);
  }, []);

  return { update, hasAnimations, playGesture, clipCount };
};
