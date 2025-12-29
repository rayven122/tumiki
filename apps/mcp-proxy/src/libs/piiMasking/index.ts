/**
 * PIIマスキングモジュール
 * GCP DLPを使用したPII（個人情報）のマスキング機能を提供
 */

export {
  closeDlpClient,
  maskJson,
  maskText,
  resetProjectIdCache,
} from "./gcpDlpClient.js";
export {
  DEFAULT_INFO_TYPES,
  type DetectedPii,
  type InfoType,
  type JsonMaskingResult,
  type TextMaskingResult,
  type PiiMaskingOptions,
} from "./types.js";
