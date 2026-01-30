/**
 * アバターモード状態管理（Jotai）
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// 背景画像のパス
export type BackgroundType =
  | "kyoto_future"
  | "futuristic_city_night"
  | "cyber_city";

// 利用可能な背景画像
export const BACKGROUND_IMAGES: Record<BackgroundType, string> = {
  kyoto_future: "/backgrounds/stage_kyoto_future.png",
  futuristic_city_night: "/backgrounds/stage_futuristic_city_night.png",
  cyber_city: "/backgrounds/cyber_city.png",
};

// 選択された背景（localStorage に永続化）
export const avatarModeBackgroundAtom = atomWithStorage<BackgroundType>(
  "avatar-mode-background",
  "kyoto_future",
);

// チャットパネルの表示/非表示
export const avatarModeChatPanelVisibleAtom = atom(true);

// クイックリプライの表示/非表示
export const avatarModeQuickRepliesVisibleAtom = atom(true);
