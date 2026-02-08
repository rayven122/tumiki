// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Enterprise Edition 機能
 *
 * EE版ではすべてのEE機能が有効。
 * 環境変数でオプション機能を制御可能。
 */

// EE版ではEE機能が利用可能
export const EE_AVAILABLE = true;

/**
 * EE機能の種類
 */
export type EEFeature =
  | "member-management"
  | "role-management"
  | "group-management"
  | "organization-creation";

/**
 * 環境変数による機能制御
 * - TUMIKI_ENABLE_ORG_CREATION: 組織作成機能の有効/無効（デフォルト: true）
 */
const FEATURE_FLAGS: Record<EEFeature, boolean> = {
  "member-management": true,
  "role-management": true,
  "group-management": true,
  "organization-creation": process.env.TUMIKI_ENABLE_ORG_CREATION !== "false",
};

/**
 * 指定された機能がEE版で利用可能かどうかを判定
 */
export const isEEFeatureAvailable = (feature: EEFeature): boolean => {
  return FEATURE_FLAGS[feature] ?? false;
};

/**
 * 利用可能なEE機能の一覧を取得
 */
export const getAvailableEEFeatures = (): EEFeature[] => {
  return (Object.keys(FEATURE_FLAGS) as EEFeature[]).filter(
    (feature) => FEATURE_FLAGS[feature],
  );
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
};

/**
 * 全EE機能の情報を取得
 */
export const getAllEEFeatureInfo = (): EEFeatureInfo[] => {
  return (Object.keys(FEATURE_FLAGS) as EEFeature[]).map((feature) => ({
    feature,
    available: FEATURE_FLAGS[feature],
    description: FEATURE_DESCRIPTIONS[feature],
  }));
};
