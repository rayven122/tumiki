"use client";

/**
 * アニメーション管理フック
 * VRM アバターのアニメーション再生を管理
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { VRMAAnimationManager } from "@/features/avatar/services/VRMAAnimationManager";
import { getAvailableVrmaPaths } from "@/features/avatar/utils";

type AnimationManagerResult = {
  update: (deltaTime: number) => void;
  hasAnimations: boolean;
};

export const useAnimationManager = (
  vrm: VRM | null,
): AnimationManagerResult => {
  const managerRef = useRef<VRMAAnimationManager | null>(null);
  const [hasAnimations, setHasAnimations] = useState(false);

  // アニメーションマネージャーの初期化と連続ランダムアニメーション開始
  useEffect(() => {
    if (!vrm) {
      managerRef.current?.dispose();
      managerRef.current = null;
      setHasAnimations(false);
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
    };

    void initManager();

    return () => {
      managerRef.current?.dispose();
    };
  }, [vrm]);

  const update = useCallback((_deltaTime: number) => {
    managerRef.current?.update();
  }, []);

  return { update, hasAnimations };
};
