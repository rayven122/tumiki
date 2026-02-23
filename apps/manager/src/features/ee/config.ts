/**
 * EE/CE エディション設定
 *
 * ビルド時に環境変数で判定される。
 * NEXT_PUBLIC_EE_BUILD=true -> EE版
 * 未設定または false -> CE版
 */

/**
 * EE版が有効かどうか（ビルド時に決定）
 */
export const EE_AVAILABLE = process.env.NEXT_PUBLIC_EE_BUILD === "true";

/**
 * 組織作成機能が有効かどうか（EE版のみ）
 */
export const ORG_CREATION_ENABLED =
  EE_AVAILABLE && process.env.NEXT_PUBLIC_ENABLE_ORG_CREATION === "true";

/**
 * EE機能の種類
 */
export type EEFeature =
  | "member-management"
  | "role-management"
  | "group-management"
  | "organization-creation"
  | "dynamic-search"
  | "pii-dashboard";

// 全EE機能の一覧
const ALL_EE_FEATURES: EEFeature[] = [
  "member-management",
  "role-management",
  "group-management",
  "organization-creation",
  "dynamic-search",
  "pii-dashboard",
];

/**
 * 機能の説明
 */
const FEATURE_DESCRIPTIONS: Record<EEFeature, string> = {
  "member-management": "組織メンバーの管理機能",
  "role-management": "ロールベースのアクセス制御機能",
  "group-management": "グループ管理機能",
  "organization-creation": "新規組織作成機能",
  "dynamic-search": "MCPツールの動的検索機能",
  "pii-dashboard": "PII検知ダッシュボード表示機能",
};

/**
 * 指定されたEE機能が利用可能かどうかを判定
 */
export const isEEFeatureAvailable = (feature: EEFeature): boolean => {
  if (!EE_AVAILABLE) return false;

  if (feature === "organization-creation") {
    return ORG_CREATION_ENABLED;
  }

  return true;
};

/**
 * 利用可能なEE機能の一覧を取得
 */
export const getAvailableEEFeatures = (): EEFeature[] => {
  if (!EE_AVAILABLE) return [];
  return ALL_EE_FEATURES.filter((feature) => isEEFeatureAvailable(feature));
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
 * 全EE機能の情報を取得
 */
export const getAllEEFeatureInfo = (): EEFeatureInfo[] =>
  ALL_EE_FEATURES.map((feature) => ({
    feature,
    available: isEEFeatureAvailable(feature),
    description: FEATURE_DESCRIPTIONS[feature],
  }));
