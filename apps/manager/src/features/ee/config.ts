/**
 * EE/CE エディション設定
 *
 * @tumiki/license パッケージを使用してライセンス状態を判定。
 * 環境変数 NEXT_PUBLIC_TUMIKI_EDITION=ee でEE版が有効になる。
 *
 * 将来のライセンスキー方式への移行も @tumiki/license で対応可能。
 */

import {
  isEE as checkIsEE,
  hasFeature,
  getEnabledFeatures,
  type EEFeature as LicenseEEFeature,
} from "@tumiki/license";

/**
 * EE版が有効かどうか
 */
export const EE_AVAILABLE = checkIsEE();

/**
 * 組織作成機能が有効かどうか
 */
export const ORG_CREATION_ENABLED = hasFeature("organization-creation");

/**
 * EE機能の種類（manager固有の機能名を維持）
 */
export type EEFeature =
  | "member-management"
  | "role-management"
  | "group-management"
  | "organization-creation"
  | "dynamic-search"
  | "custom-roles"
  | "pii-dashboard";

/**
 * ライセンスパッケージの機能名とmanager固有の機能名のマッピング
 */
const featureMapping: Record<EEFeature, LicenseEEFeature | null> = {
  "member-management": null, // EE版なら常に有効
  "role-management": "custom-roles",
  "group-management": null, // EE版なら常に有効
  "organization-creation": "organization-creation",
  "dynamic-search": "dynamic-search",
  "custom-roles": "custom-roles",
  "pii-dashboard": "pii-dashboard",
};

/**
 * 指定されたEE機能が利用可能かどうかを判定
 */
export const isEEFeatureAvailable = (feature: EEFeature): boolean => {
  if (!EE_AVAILABLE) return false;

  const licenseFeature = featureMapping[feature];

  // マッピングがない機能はEE版なら常に有効
  if (licenseFeature === null) {
    return true;
  }

  return hasFeature(licenseFeature);
};

/**
 * 利用可能なEE機能の一覧を取得
 */
export const getAvailableEEFeatures = (): EEFeature[] => {
  if (!EE_AVAILABLE) return [];

  const allFeatures: EEFeature[] = [
    "member-management",
    "role-management",
    "group-management",
    "organization-creation",
    "dynamic-search",
    "custom-roles",
    "pii-dashboard",
  ];

  return allFeatures.filter((feature) => isEEFeatureAvailable(feature));
};

/**
 * EE機能情報の型定義
 */
export type EEFeatureInfo = {
  feature: EEFeature;
  available: boolean;
  description: string;
};

/**
 * 機能の説明
 */
const FEATURE_DESCRIPTIONS: Record<EEFeature, string> = {
  "member-management": "組織メンバーの管理機能",
  "role-management": "ロールベースのアクセス制御機能",
  "group-management": "グループ管理機能",
  "organization-creation": "新規組織作成機能",
  "dynamic-search": "MCPツールの動的検索機能",
  "custom-roles": "カスタムロール機能",
  "pii-dashboard": "PII検知ダッシュボード表示機能",
};

/**
 * 全EE機能の情報を取得
 */
export const getAllEEFeatureInfo = (): EEFeatureInfo[] => {
  const features: EEFeature[] = [
    "member-management",
    "role-management",
    "group-management",
    "organization-creation",
    "dynamic-search",
    "custom-roles",
    "pii-dashboard",
  ];

  return features.map((feature) => ({
    feature,
    available: isEEFeatureAvailable(feature),
    description: FEATURE_DESCRIPTIONS[feature],
  }));
};

// @tumiki/license の機能も再エクスポート
export { getEnabledFeatures, hasFeature };
