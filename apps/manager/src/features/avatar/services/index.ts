/**
 * アバター機能 サービスモジュール
 * VRM アバター表示と音声合成機能を提供
 */

export * from "./tts";
export { AudioPlayer } from "./AudioPlayer";
export { SpeechQueue, type SpeechQueueOptions } from "./speechQueue";
export { VRMAAnimationManager } from "./VRMAAnimationManager";
