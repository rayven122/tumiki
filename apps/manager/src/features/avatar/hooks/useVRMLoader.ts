"use client";

/**
 * VRM ローダーフック
 * VRM モデルのロードと管理
 */

import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { VRM_PATH, checkVrmExists } from "@/features/avatar/utils";

type VRMLoaderResult = {
  vrm: VRM | null;
  isLoading: boolean;
  error: string | null;
  isVrmAvailable: boolean | null;
  loadVRM: (url: string) => Promise<VRM | null>;
  unloadVRM: () => void;
  loadDefaultVRM: () => Promise<void>;
  checkAvailability: () => Promise<boolean>;
};

export const useVRMLoader = (scene: THREE.Scene | null): VRMLoaderResult => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVrmAvailable, setIsVrmAvailable] = useState<boolean | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);

  // VRM ファイルの存在確認
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    const exists = await checkVrmExists();
    setIsVrmAvailable(exists);
    return exists;
  }, []);

  // 初期化時に存在確認を実行
  useEffect(() => {
    void checkAvailability();
  }, [checkAvailability]);

  const loadVRM = useCallback(
    async (url: string): Promise<VRM | null> => {
      if (!scene) {
        setError("Scene is not initialized");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!loaderRef.current) {
          loaderRef.current = new GLTFLoader();
          loaderRef.current.register((parser) => new VRMLoaderPlugin(parser));
        }

        const gltf = await loaderRef.current.loadAsync(url);
        const loadedVrm = gltf.userData.vrm as VRM;

        if (!loadedVrm) {
          throw new Error("VRM data not found in GLTF");
        }

        // モデルの回転（カメラに向くように180度回転）
        loadedVrm.scene.rotation.y = Math.PI;

        // シャドウを有効化
        loadedVrm.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
          }
        });

        // シーンに追加
        scene.add(loadedVrm.scene);

        // LookAt の初期化
        if (loadedVrm.lookAt) {
          loadedVrm.lookAt.target = new THREE.Object3D();
          loadedVrm.lookAt.target.position.set(0, 0, 1);
        }

        setVrm(loadedVrm);
        setIsLoading(false);
        return loadedVrm;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load VRM";

        // ファイルが見つからない場合の明確なエラーメッセージ
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("Not Found")
        ) {
          setError(
            "VRMファイルが見つかりません。docs/coharu-setup.md を参照してファイルを配置してください。",
          );
        } else {
          setError(errorMessage);
        }

        setIsLoading(false);
        console.error("Failed to load VRM:", err);
        return null;
      }
    },
    [scene],
  );

  const unloadVRM = useCallback(() => {
    if (vrm && scene) {
      scene.remove(vrm.scene);
      VRMUtils.deepDispose(vrm.scene);
      setVrm(null);
    }
  }, [vrm, scene]);

  const loadDefaultVRM = useCallback(async () => {
    // 存在確認してからロード
    const exists = await checkAvailability();
    if (!exists) {
      setError(
        "VRMファイルが見つかりません。docs/coharu-setup.md を参照してファイルを配置してください。",
      );
      return;
    }
    await loadVRM(VRM_PATH);
  }, [loadVRM, checkAvailability]);

  return {
    vrm,
    isLoading,
    error,
    isVrmAvailable,
    loadVRM,
    unloadVRM,
    loadDefaultVRM,
    checkAvailability,
  };
};
