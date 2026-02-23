/**
 * ライセンスチェッカー
 *
 * 現在の実装: 環境変数 TUMIKI_EDITION で判定
 * 将来の拡張: ライセンスキー検証を追加可能
 */

import type { Edition, EEFeature, LicenseInfo } from "./types.js";
import { CURRENT_EE_FEATURES } from "./types.js";

// ライセンス情報のキャッシュ（パフォーマンス最適化）
let cachedLicenseInfo: LicenseInfo | null = null;

/**
 * 環境変数からエディションを取得
 *
 * 対応する環境変数（優先順位順）:
 * 1. TUMIKI_EDITION - サーバーサイド用（mcp-proxy等）
 * 2. NEXT_PUBLIC_EE_BUILD - Next.jsクライアント用（manager等）
 */
const getEditionFromEnv = (): Edition => {
  // サーバーサイド用
  const tumikiEdition = process.env.TUMIKI_EDITION;
  if (tumikiEdition === "ee") {
    return "ee";
  }

  // Next.jsクライアント用（NEXT_PUBLIC_プレフィックス）
  const nextPublicEE = process.env.NEXT_PUBLIC_EE_BUILD;
  if (nextPublicEE === "true") {
    return "ee";
  }

  return "ce";
};

/**
 * 将来のライセンスキー検証用プレースホルダー
 * ライセンスキー方式に移行する際にここを実装
 */
// const validateLicenseKey = (key: string): LicenseInfo | null => {
//   // TODO: ライセンスキーの署名検証
//   // TODO: 有効期限チェック
//   // TODO: 機能リストの取得
//   return null;
// };

/**
 * ライセンス情報を取得
 *
 * 判定優先順位:
 * 1. ライセンスキー（将来実装）
 * 2. 環境変数 TUMIKI_EDITION
 * 3. デフォルト: CE版
 */
export const getLicenseInfo = (): LicenseInfo => {
  // キャッシュがあれば返す
  if (cachedLicenseInfo) {
    return cachedLicenseInfo;
  }

  // 将来: ライセンスキー検証
  // const licenseKey = process.env["TUMIKI_LICENSE_KEY"];
  // if (licenseKey) {
  //   const keyInfo = validateLicenseKey(licenseKey);
  //   if (keyInfo) {
  //     cachedLicenseInfo = keyInfo;
  //     return keyInfo;
  //   }
  // }

  // 現在: 環境変数で判定
  const edition = getEditionFromEnv();

  cachedLicenseInfo = {
    edition,
    features: edition === "ee" ? CURRENT_EE_FEATURES : [],
  };

  return cachedLicenseInfo;
};

/**
 * キャッシュをクリア（テスト用）
 */
export const clearLicenseCache = (): void => {
  cachedLicenseInfo = null;
};

/**
 * EE版かどうかを判定
 */
export const isEE = (): boolean => {
  return getLicenseInfo().edition === "ee";
};

/**
 * CE版かどうかを判定
 */
export const isCE = (): boolean => {
  return getLicenseInfo().edition === "ce";
};

/**
 * 特定の機能が有効かどうかを判定
 */
export const hasFeature = (feature: EEFeature): boolean => {
  return getLicenseInfo().features.includes(feature);
};

/**
 * 有効な機能リストを取得
 */
export const getEnabledFeatures = (): EEFeature[] => {
  return getLicenseInfo().features;
};

/**
 * 現在のエディションを取得
 */
export const getEdition = (): Edition => {
  return getLicenseInfo().edition;
};
