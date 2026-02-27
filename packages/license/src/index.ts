/**
 * @tumiki/license
 *
 * Tumikiのライセンス管理パッケージ
 *
 * 使用方法:
 * ```typescript
 * import { isEE, hasFeature } from "@tumiki/license";
 *
 * if (isEE()) {
 *   // EE版のみの処理
 * }
 *
 * if (hasFeature("organization-creation")) {
 *   // 組織作成機能が有効な場合の処理
 * }
 * ```
 *
 * 環境変数:
 * - NEXT_PUBLIC_TUMIKI_EDITION: "ee" または "ce"（デフォルト: "ce"）
 * - TUMIKI_LICENSE_KEY: ライセンスキー（将来実装）
 */

// 型定義
export type { Edition, EEFeature, LicenseInfo } from "./types.js";
export { ALL_EE_FEATURES, CURRENT_EE_FEATURES } from "./types.js";

// ライセンスチェッカー
export {
  getLicenseInfo,
  clearLicenseCache,
  isEE,
  isCE,
  hasFeature,
  getEnabledFeatures,
  getEdition,
} from "./checker.js";
