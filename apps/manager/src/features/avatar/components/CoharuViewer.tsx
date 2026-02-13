"use client";

/**
 * Coharu VRM ビューワーコンポーネント
 * VRM アバターの表示とアニメーション管理
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/features/avatar/hooks/useThreeScene";
import { useVRMLoader } from "@/features/avatar/hooks/useVRMLoader";
import { useAnimationManager } from "@/features/avatar/hooks/useAnimationManager";
import { useCoharuContext } from "@/features/avatar/hooks/useCoharuContext";

/**
 * VRM未存在時のフォールバック表示
 */
const VrmNotFoundFallback = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
      <div className="mb-2 text-3xl">🎭</div>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        VRMファイルが
        <br />
        見つかりません
      </p>
      <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-500">
        docs/coharu-setup.md
        <br />
        を参照してください
      </p>
    </div>
  );
};

export const CoharuViewer = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationIdRef = useRef<number | null>(null);

  const { isEnabled, setVrm, updateLipSync } = useCoharuContext();

  // Three.js シーンのセットアップ
  const { scene, camera, renderer } = useThreeScene(mountRef);

  // VRM ローダー
  const { vrm, isVrmAvailable, loadDefaultVRM } = useVRMLoader(scene);

  // アニメーション管理
  const { update: updateAnimation } = useAnimationManager(vrm);

  // VRM をコンテキストに設定
  useEffect(() => {
    if (vrm) {
      setVrm(vrm);
    } else {
      setVrm(null);
    }
  }, [vrm, setVrm]);

  // 初期 VRM モデルの読み込み（isEnabled 時のみ遅延ロード）
  // Coharu が有効になった時点で初めて VRM をロードする
  // 一度ロードした VRM は無効→再有効化時も再利用される
  useEffect(() => {
    if (scene && isEnabled && !vrm && isVrmAvailable) {
      void loadDefaultVRM();
    }
  }, [scene, isEnabled, vrm, isVrmAvailable, loadDefaultVRM]);

  // アニメーションループ
  useEffect(() => {
    if (!vrm || !camera || !renderer || !scene) {
      return;
    }

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const deltaTime = clockRef.current.getDelta();

      // アニメーション更新
      updateAnimation(deltaTime);

      // VRM 更新
      vrm.update(deltaTime);

      // リップシンク更新
      updateLipSync();

      // レンダリング
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [vrm, camera, renderer, scene, updateAnimation, updateLipSync]);

  // VRMが利用不可の場合はフォールバックを表示
  if (isVrmAvailable === false) {
    return (
      <div className="relative h-64 w-52">
        <VrmNotFoundFallback />
      </div>
    );
  }

  return (
    <div className="relative h-64 w-52">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
};
