// Authoritative Source 判定
// テナント設定に従い、ある action が許可されるかを判定する pure 関数

import type { SourceId } from "../domain/branded.js";
import type { TenantIdpConfiguration } from "../domain/tenant.js";

// User の deactivate / 認証停止系 action を実行できるのは authoritative source のみ
// JIT 等の補助 source からの deactivate は無視する（security 上必須）
export const canDeactivateUser = (
  config: TenantIdpConfiguration,
  source: SourceId,
): boolean => config.authoritativeSourceForUsers === source;

// Group / Membership の真実は authoritative source のみが定める
// 補助 source からの membership 追加は許可するが削除は許可しない
export const canDefineGroupMembership = (
  config: TenantIdpConfiguration,
  source: SourceId,
): boolean => config.authoritativeSourceForGroups === source;

// Group 削除権限の判定
// 現状は canDefineGroupMembership と同じ authoritative source を参照するが、
// 将来 membership 制御と group 削除制御を分離する場合に備えて専用関数を提供する
export const canDeleteGroup = (
  config: TenantIdpConfiguration,
  source: SourceId,
): boolean => config.authoritativeSourceForGroups === source;

// JIT 経路で新規 User を作成してよいかをテナント設定で判定
export const isJitAllowed = (config: TenantIdpConfiguration): boolean =>
  config.jitAllowed;
