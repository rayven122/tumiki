/**
 * PIIマスキングモジュール
 * GCP DLPを使用したPII（個人情報）のマスキング機能を提供
 */

export {
  closeDlpClient,
  getPiiMaskingConfig,
  maskJson,
  maskText,
  resetProjectIdCache,
} from "./gcpDlpClient.js";
export { maskMcpMessage } from "./jsonRpcMasker.js";
export {
  DEFAULT_INFO_TYPES,
  type InfoType,
  type JsonMaskingResult,
  type MaskingResult,
  type PiiMaskingConfig,
} from "./types.js";
