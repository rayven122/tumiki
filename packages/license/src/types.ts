/**
 * ライセンス関連の型定義
 */

/**
 * エディション種別
 * - ce: Community Edition（無料版）
 * - ee: Enterprise Edition（有料版）
 */
export type Edition = "ce" | "ee";

/**
 * EE機能の識別子
 * 新しいEE機能を追加する場合はここに追加
 */
export type EEFeature =
  | "organization-creation" // 組織作成
  | "custom-roles" // カスタムロール
  | "dynamic-search" // 動的ツール検索
  | "pii-dashboard" // PII検知ダッシュボード
  | "audit-log" // 監査ログ（将来）
  | "sso" // SSO連携（将来）
  | "advanced-analytics"; // 高度な分析（将来）

/**
 * ライセンス情報
 * 将来のライセンスキー方式に対応するための拡張可能な構造
 */
export type LicenseInfo = {
  /** エディション */
  edition: Edition;
  /** 有効な機能リスト */
  features: EEFeature[];
  /** ライセンス有効期限（将来用） */
  expiresAt?: Date;
  /** ライセンス先（将来用） */
  licensedTo?: string;
  /** 最大ユーザー数（将来用） */
  maxUsers?: number;
};

/**
 * 全EE機能のリスト
 */
export const ALL_EE_FEATURES: EEFeature[] = [
  "organization-creation",
  "custom-roles",
  "dynamic-search",
  "pii-dashboard",
  "audit-log",
  "sso",
  "advanced-analytics",
];

/**
 * 現在有効なEE機能（将来の機能は除外）
 */
export const CURRENT_EE_FEATURES: EEFeature[] = [
  "organization-creation",
  "custom-roles",
  "dynamic-search",
  "pii-dashboard",
];
