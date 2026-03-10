/**
 * Coharu 状態管理（Jotai）
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { VRM } from "@pixiv/three-vrm";
import type { SpeechQueue } from "@/features/avatar/services/speechQueue";

// 有効/無効（localStorage に永続化）
export const coharuEnabledAtom = atomWithStorage("coharu-enabled", false);

// VRM インスタンス
export const coharuVrmAtom = atom<VRM | null>(null);

// 音声再生中かどうか
export const coharuSpeakingAtom = atom(false);

// SpeechQueue インスタンス（コンポーネント間で共有）
export const coharuSpeechQueueAtom = atom<SpeechQueue | null>(null);
