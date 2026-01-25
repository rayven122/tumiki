"use client";

/**
 * アニメーション管理フック
 * VRM アバターのアニメーション再生を管理
 */

import { useRef, useEffect, useCallback } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { VRMAAnimationManager } from "@/lib/coharu/VRMAAnimationManager";

type AnimationManagerResult = {
  update: (deltaTime: number) => void;
};

export const useAnimationManager = (
  vrm: VRM | null,
): AnimationManagerResult => {
  const managerRef = useRef<VRMAAnimationManager | null>(null);

  // アニメーションマネージャーの初期化と連続ランダムアニメーション開始
  useEffect(() => {
    if (!vrm) {
      managerRef.current?.dispose();
      managerRef.current = null;
      return;
    }

    const manager = new VRMAAnimationManager(vrm);
    managerRef.current = manager;

    // 連続ランダムアニメーション開始
    void manager.startContinuousRandomAnimations();

    return () => {
      manager.dispose();
    };
  }, [vrm]);

  const update = useCallback((_deltaTime: number) => {
    managerRef.current?.update();
  }, []);

  return { update };
};
