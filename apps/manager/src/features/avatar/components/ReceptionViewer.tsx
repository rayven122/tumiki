"use client";

/**
 * 受付モード用 VRM ビューワーコンポーネント
 * 中央配置で会話連動ジェスチャー・表情・頷き・瞬き付きのVRMアバター
 */

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useAvatarModeThreeScene } from "@/features/avatar/hooks/useAvatarModeThreeScene";
import { useVRMLoader } from "@/features/avatar/hooks/useVRMLoader";
import { useAnimationManager } from "@/features/avatar/hooks/useAnimationManager";
import { useCoharuContext } from "@/features/avatar/hooks/useCoharuContext";
import { useConversationGestures } from "@/features/avatar/hooks/useConversationGestures";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type ReceptionViewerProps = {
  messages: UIMessage[];
  status: UseChatHelpers<ChatMessage>["status"];
};

/**
 * VRM未存在時のフォールバック表示
 */
const VrmNotFoundFallback = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-100/90 p-8 shadow-lg dark:bg-gray-800/90">
        <div className="mb-4 text-6xl">🎭</div>
        <p className="text-center text-lg font-medium text-gray-700 dark:text-gray-300">
          VRMファイルが見つかりません
        </p>
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          docs/coharu-setup.md を参照して
          <br />
          VRMファイルを配置してください
        </p>
      </div>
    </div>
  );
};

export const ReceptionViewer = ({
  messages,
  status,
}: ReceptionViewerProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationIdRef = useRef<number | null>(null);

  const { setVrm, updateLipSync } = useCoharuContext();

  // フルスクリーン用 Three.js シーンのセットアップ
  const { scene, camera, renderer } = useAvatarModeThreeScene(mountRef);

  // VRM ローダー
  const { vrm, isVrmAvailable, loadDefaultVRM } = useVRMLoader(scene);

  // アニメーション管理（ジェスチャー優先再生対応）
  const {
    update: updateAnimation,
    playGesture,
    clipCount,
  } = useAnimationManager(vrm);

  // 会話連動ジェスチャー（表情・頷き・瞬き・VRMAトリガー）
  const { updateGestures } = useConversationGestures({
    vrm,
    messages,
    status,
    playGesture,
    clipCount,
  });

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
    if (scene && !vrm && isVrmAvailable) {
      void loadDefaultVRM();
    }
  }, [scene, vrm, isVrmAvailable, loadDefaultVRM]);

  // ジェスチャー更新コールバック
  const updateGesturesCallback = useCallback(() => {
    updateGestures();
  }, [updateGestures]);

  // アニメーションループ
  useEffect(() => {
    if (!vrm || !camera || !renderer || !scene) {
      return;
    }

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const deltaTime = clockRef.current.getDelta();

      // VRMAアニメーション更新
      updateAnimation(deltaTime);

      // VRM 更新
      vrm.update(deltaTime);

      // リップシンク更新（口パク）
      updateLipSync();

      // 会話連動ジェスチャー更新（表情・頷き・瞬き）
      updateGesturesCallback();

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
  }, [
    vrm,
    camera,
    renderer,
    scene,
    updateAnimation,
    updateLipSync,
    updateGesturesCallback,
  ]);

  // VRMが利用不可の場合はフォールバックを表示
  if (isVrmAvailable === false) {
    return <VrmNotFoundFallback />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center">
      {/* VRMコンテナ - 中央配置 */}
      <div
        ref={mountRef}
        className="h-full w-[70%]"
        style={{ marginBottom: "-5%" }}
      />
    </div>
  );
};
