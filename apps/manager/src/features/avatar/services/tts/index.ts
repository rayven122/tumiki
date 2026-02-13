/**
 * TTS（Text-to-Speech）モジュール
 * Aivis Cloud API に対応
 */

export type { TTSClient, TTSOptions } from "./TTSClient";

export {
  AivisCloudTTSClient,
  type AivisCloudConfig,
} from "./AivisCloudTTSClient";
export { TTSApiClient, type TTSApiClientConfig } from "./TTSApiClient";
