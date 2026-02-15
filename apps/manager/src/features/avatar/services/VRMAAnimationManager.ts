/**
 * VRMA アニメーション管理クラス
 * VRM アバターのアニメーション再生を管理
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { VRM } from "@pixiv/three-vrm";
import {
  type VRMAnimation,
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";
import { VRMA_PATHS } from "@/features/avatar/utils";

export class VRMAAnimationManager {
  private vrm: VRM;
  private mixer: THREE.AnimationMixer;
  private currentAction: THREE.AnimationAction | null = null;
  private clips: THREE.AnimationClip[] = [];
  private loader: GLTFLoader;
  private clock: THREE.Clock;
  private isRunning = false;
  private animationPaths: readonly string[];

  /**
   * @param vrm VRMインスタンス
   * @param animationPaths アニメーションファイルのパス配列（省略時はデフォルトパスを使用）
   */
  constructor(vrm: VRM, animationPaths?: readonly string[]) {
    this.vrm = vrm;
    this.mixer = new THREE.AnimationMixer(vrm.scene);
    this.clock = new THREE.Clock();
    this.animationPaths = animationPaths ?? VRMA_PATHS;

    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * 全アニメーションを読み込み
   */
  private async loadAllAnimations(): Promise<void> {
    if (this.animationPaths.length === 0) {
      console.warn("No animation paths provided");
      return;
    }

    const loadPromises = this.animationPaths.map(async (path) => {
      try {
        const gltf = await this.loader.loadAsync(path);
        const vrmAnimations = gltf.userData?.vrmAnimations as
          | VRMAnimation[]
          | undefined;
        const vrmAnimation =
          vrmAnimations?.[0] ?? (gltf.userData?.vrmAnimation as VRMAnimation);

        if (vrmAnimation) {
          return createVRMAnimationClip(vrmAnimation, this.vrm);
        }
      } catch (error) {
        console.error(`Failed to load animation ${path}:`, error);
      }
      return null;
    });

    const results = await Promise.all(loadPromises);
    this.clips = results.filter((clip): clip is THREE.AnimationClip => !!clip);
  }

  /**
   * ランダムなアニメーションを再生
   */
  private playRandomAnimation(): void {
    if (this.clips.length === 0) return;

    // 現在のアニメーションを停止
    if (this.currentAction) {
      this.currentAction.stop();
    }

    // ランダムに選択
    const randomIndex = Math.floor(Math.random() * this.clips.length);
    const clip = this.clips[randomIndex];
    if (!clip) return;

    // 新しいアニメーションを再生
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().fadeIn(0.3).play();

    this.currentAction = action;
  }

  /**
   * 連続ランダムアニメーション開始
   */
  async startContinuousRandomAnimations(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    await this.loadAllAnimations();

    // アニメーションがロードできなかった場合は何もしない
    if (this.clips.length === 0) {
      console.warn("No animations loaded, skipping animation playback");
      return;
    }

    const playNext = () => {
      if (!this.isRunning) return;

      this.playRandomAnimation();

      // アニメーション終了を監視して次を再生
      const checkEnd = () => {
        if (!this.isRunning) return;

        if (!this.currentAction?.isRunning()) {
          playNext();
        } else {
          setTimeout(checkEnd, 100);
        }
      };
      setTimeout(checkEnd, 100);
    };

    playNext();
  }

  /**
   * アニメーション更新
   */
  update(): void {
    const deltaTime = this.clock.getDelta();
    this.mixer.update(deltaTime);
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    this.isRunning = false;

    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }

    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.vrm.scene);
    this.clips = [];
  }
}
