"use client";

/**
 * Coharu VRM ビューワーコンポーネント
 * VRM アバターの表示とアニメーション管理
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/coharu/useThreeScene";
import { useVRMLoader } from "@/hooks/coharu/useVRMLoader";
import { useAnimationManager } from "@/hooks/coharu/useAnimationManager";
import { useCoharuContext } from "@/hooks/coharu/useCoharuContext";

export const CoharuViewer = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationIdRef = useRef<number | null>(null);

  const { isEnabled, setVrm, updateLipSync } = useCoharuContext();

  // Three.js シーンのセットアップ
  const { scene, camera, renderer } = useThreeScene(mountRef);

  // VRM ローダー
  const { vrm, loadDefaultVRM } = useVRMLoader(scene);

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
    if (scene && isEnabled && !vrm) {
      void loadDefaultVRM();
    }
  }, [scene, isEnabled, vrm, loadDefaultVRM]);

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

  return (
    <div className="relative h-64 w-52">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
};
