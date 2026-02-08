/**
 * Enterprise Edition 機能 (CE Facade)
 *
 * Community Edition ではEE機能が無効。
 * CE版でも型安全性を維持するため、型とスタブ関数をエクスポートする。
 */

// CE版ではEE機能は利用不可
export const EE_AVAILABLE = false;

/**
 * EE機能の種類
 */
export type EEFeature =
  | "member-management"
  | "role-management"
  | "group-management"
  | "organization-creation";

/**
 * 指定された機能がEE版で利用可能かどうかを判定 (CE stub)
 * CE版では常に false を返す
 */
export const isEEFeatureAvailable = (_feature: EEFeature): boolean => false;

/**
 * 利用可能なEE機能の一覧を取得 (CE stub)
 * CE版では空配列を返す
 */
export const getAvailableEEFeatures = (): EEFeature[] => [];

/**
 * EE機能情報の型定義（CE版でも型互換性のため定義）
 */
export type EEFeatureInfo = {
  feature: EEFeature;
  available: boolean;
  description: string;
};

/**
 * 全EE機能の情報を取得 (CE stub)
 * CE版では全機能が無効として返す
 */
export const getAllEEFeatureInfo = (): EEFeatureInfo[] => [
  {
    feature: "member-management",
    available: false,
    description: "組織メンバーの管理機能",
  },
  {
    feature: "role-management",
    available: false,
    description: "ロールベースのアクセス制御機能",
  },
  {
    feature: "group-management",
    available: false,
    description: "グループ管理機能",
  },
  {
    feature: "organization-creation",
    available: false,
    description: "新規組織作成機能",
  },
];
