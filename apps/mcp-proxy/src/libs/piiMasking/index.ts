/* v8 ignore start -- re-exportのみ */
export {
  closeDlpClient,
  maskJson,
  maskText,
  resetProjectIdCache,
} from "./gcpDlpClient.ee.js";
export {
  DEFAULT_INFO_TYPES,
  type DetectedPii,
  type InfoType,
  type JsonMaskingResult,
  type TextMaskingResult,
  type PiiMaskingOptions,
} from "./types.js";
/* v8 ignore stop */
