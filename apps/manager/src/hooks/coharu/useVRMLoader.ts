"use client";

/**
 * VRM ローダーフック
 * VRM モデルのロードと管理
 */

import { useState, useCallback, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

type VRMLoaderResult = {
  vrm: VRM | null;
  isLoading: boolean;
  error: string | null;
  loadVRM: (url: string) => Promise<VRM | null>;
  unloadVRM: () => void;
  loadDefaultVRM: () => Promise<void>;
};

export const useVRMLoader = (scene: THREE.Scene | null): VRMLoaderResult => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);

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
        setError(errorMessage);
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
    await loadVRM("/coharu/vrm/coharu.vrm");
  }, [loadVRM]);

  return {
    vrm,
    isLoading,
    error,
    loadVRM,
    unloadVRM,
    loadDefaultVRM,
  };
};
