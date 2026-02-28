/**
 * 受付モード状態管理（Jotai）
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// 受付モードの背景テーマ
export type ReceptionTheme = "corporate" | "modern" | "warm";

// 受付モード設定（localStorage に永続化）
export const receptionThemeAtom = atomWithStorage<ReceptionTheme>(
  "reception-theme",
  "modern",
);

// カメラの表示/非表示
export const receptionCameraVisibleAtom = atom(true);

// 音声入力の有効/無効
export const receptionVoiceEnabledAtom = atom(false);

// 受付メッセージ（カスタマイズ可能）
export const receptionWelcomeMessageAtom = atomWithStorage(
  "reception-welcome-message",
  "いらっしゃいませ。ご用件をお聞かせください。",
);
