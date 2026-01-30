"use client";

/**
 * アバターモード用 Three.js シーン管理フック
 * フルスクリーン表示に最適化されたカメラ設定
 */

import { useEffect, useCallback, useState, type RefObject } from "react";
import * as THREE from "three";

type ThreeSceneResult = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
};

export const useAvatarModeThreeScene = (
  mountRef: RefObject<HTMLDivElement | null>,
): ThreeSceneResult => {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);

  const initScene = useCallback(() => {
    if (!mountRef.current) return null;

    // 既存の canvas がある場合は削除
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const containerRect = mountRef.current.getBoundingClientRect();
    const width = containerRect.width || window.innerWidth * 0.6;
    const height = containerRect.height || window.innerHeight;

    // Scene setup
    const newScene = new THREE.Scene();
    setScene(newScene);

    // Camera setup - フルスクリーン用に調整（全身が見えるように）
    const newCamera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    // カメラ位置: 全身が見えるように後ろに下げ、やや上から見下ろす
    newCamera.position.set(0, 0.55, 1.8);
    newCamera.lookAt(0, 0.35, 0);
    setCamera(newCamera);

    // Renderer setup - 透明背景で影を有効化
    const newRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    newRenderer.setSize(width, height);
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    newRenderer.outputColorSpace = THREE.SRGBColorSpace;
    newRenderer.shadowMap.enabled = true;
    newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    setRenderer(newRenderer);
    mountRef.current.appendChild(newRenderer.domElement);

    // Lighting setup - 落ち着いた明るさ（背景に溶け込むように調整）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0, 3, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 10;
    directionalLight.shadow.camera.left = -3;
    directionalLight.shadow.camera.right = 3;
    directionalLight.shadow.camera.top = 3;
    directionalLight.shadow.camera.bottom = -3;
    newScene.add(directionalLight);

    // 補助光（左側からの fill light）
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 1, 1);
    newScene.add(fillLight);

    // 後ろからの rim light（輪郭を際立たせる）
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
    rimLight.position.set(0, 1, -2);
    newScene.add(rimLight);

    // 透明な影受けステージ
    const stageGeometry = new THREE.CircleGeometry(2.5, 64);
    const stageMaterial = new THREE.ShadowMaterial({
      opacity: 0.3,
    });
    const stage = new THREE.Mesh(stageGeometry, stageMaterial);
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = 0;
    stage.receiveShadow = true;
    newScene.add(stage);

    return { scene: newScene, camera: newCamera, renderer: newRenderer };
  }, [mountRef]);

  const handleResize = useCallback(() => {
    if (!camera || !renderer || !mountRef.current) return;

    const containerRect = mountRef.current.getBoundingClientRect();
    const width = containerRect.width || window.innerWidth * 0.6;
    const height = containerRect.height || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }, [camera, renderer, mountRef]);

  useEffect(() => {
    const setupResult = initScene();
    if (!setupResult) {
      return;
    }

    // debounce されたリサイズハンドラ
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debouncedResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedResize);

      // Three.js リソースの適切なクリーンアップ
      if (setupResult.scene) {
        setupResult.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // ジオメトリのクリーンアップ
            child.geometry?.dispose();

            // マテリアルのクリーンアップ
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((mat) => {
              if (mat) {
                // テクスチャのクリーンアップ
                Object.values(mat).forEach((value) => {
                  if (value instanceof THREE.Texture) {
                    value.dispose();
                  }
                });
                mat.dispose();
              }
            });
          }

          // VRM固有のリソースクリーンアップ
          if ("userData" in child && child.userData?.vrm) {
            try {
              child.userData.vrm.dispose?.();
            } catch {
              // VRM dispose エラーは無視
            }
          }
        });

        // シーンのクリア
        setupResult.scene.clear();
      }

      if (setupResult.renderer) {
        setupResult.renderer.dispose();
        setupResult.renderer.forceContextLoss();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  return { scene, camera, renderer };
};
