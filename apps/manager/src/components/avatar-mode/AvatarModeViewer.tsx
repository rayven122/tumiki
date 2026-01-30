"use client";

/**
 * アバターモード用 VRM ビューワーコンポーネント
 * フルスクリーン表示に最適化されたVRMアバター
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useAvatarModeThreeScene } from "@/hooks/avatar-mode/useAvatarModeThreeScene";
import { useVRMLoader } from "@/hooks/coharu/useVRMLoader";
import { useAnimationManager } from "@/hooks/coharu/useAnimationManager";
import { useCoharuContext } from "@/hooks/coharu/useCoharuContext";

export const AvatarModeViewer = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationIdRef = useRef<number | null>(null);

  const { setVrm, updateLipSync } = useCoharuContext();

  // フルスクリーン用 Three.js シーンのセットアップ
  const { scene, camera, renderer } = useAvatarModeThreeScene(mountRef);

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

  // 初期 VRM モデルの読み込み
  useEffect(() => {
    if (scene && !vrm) {
      void loadDefaultVRM();
    }
  }, [scene, vrm, loadDefaultVRM]);

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
    <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center">
      {/* VRMコンテナ - 画面の60%幅、右寄り配置 */}
      <div
        ref={mountRef}
        className="h-full w-[60%] translate-x-[15%]"
        style={{ marginBottom: "-5%" }}
      />
    </div>
  );
};
