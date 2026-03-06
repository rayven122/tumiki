"use client";

/**
 * Three.js シーン管理フック
 * シーン、カメラ、レンダラーの初期化と管理
 */

import { useEffect, useCallback, useState, type RefObject } from "react";
import * as THREE from "three";

type ThreeSceneResult = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
};

export const useThreeScene = (
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
    const width = containerRect.width || 400;
    const height = containerRect.height || 600;

    // Scene setup
    const newScene = new THREE.Scene();
    setScene(newScene);

    // Camera setup - 全身が見えるように上から見下ろす（VRMの高さ: 約0.85）
    const newCamera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    newCamera.position.set(0, 0.7, 1.8);
    newCamera.lookAt(0, 0.35, 0);
    setCamera(newCamera);

    // Renderer setup - シャドウを有効化
    const newRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    newRenderer.setSize(width, height);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    newRenderer.outputColorSpace = THREE.SRGBColorSpace;
    newRenderer.shadowMap.enabled = true;
    newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    setRenderer(newRenderer);
    mountRef.current.appendChild(newRenderer.domElement);

    // Lighting setup - 明るめの設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    newScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
    directionalLight.position.set(0, 3, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 10;
    directionalLight.shadow.camera.left = -2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.camera.bottom = -2;
    newScene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-2, 1, 1);
    newScene.add(fillLight);

    // ステージ（影を受ける透明な床）
    const stageGeometry = new THREE.CircleGeometry(1.5, 32);
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
    const width = containerRect.width || 400;
    const height = containerRect.height || 600;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }, [camera, renderer, mountRef]);

  useEffect(() => {
    const setupResult = initScene();
    if (!setupResult) {
      return;
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      // Three.js リソースの適切なクリーンアップ
      if (setupResult.scene) {
        setupResult.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            (child.geometry as THREE.BufferGeometry | null)?.dispose();
            const material = child.material as
              | THREE.Material
              | THREE.Material[];
            if (Array.isArray(material)) {
              material.forEach((mat) => mat.dispose());
            } else {
              material?.dispose();
            }
          }
        });
      }

      if (setupResult.renderer) {
        setupResult.renderer.dispose();
        setupResult.renderer.forceContextLoss();
      }
    };
  }, []); // 初回のみ実行（依存配列は意図的に空）

  return { scene, camera, renderer };
};
