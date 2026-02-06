import type { Session } from "next-auth";

/**
 * 管理者権限を持つロール名
 */
export const ADMIN_ROLES = ["Owner", "Admin"] as const;

/**
 * 指定されたロール名が管理者権限を持つかどうかを判定
 */
export const isAdminRole = (roleName: string): boolean =>
  ADMIN_ROLES.includes(roleName as (typeof ADMIN_ROLES)[number]);

/**
 * ロール配列に管理者権限を持つロールが含まれているかを判定
 */
export const hasAdminRole = (roles: readonly string[]): boolean =>
  roles.some(isAdminRole);

/**
 * セッション情報の型定義
 */
export type SessionInfo = {
  organizationSlug: string | null;
  organizationId: string | null;
  roles: string[];
  isAdmin: boolean;
};

/**
 * セッションから組織関連情報を取得する統合関数
 * Auth.jsのJWTコールバックで変換されたtumiki claimsから必要な情報を抽出
 *
 * @param session - Next-Authセッションオブジェクト
 * @returns 組織slug、組織ID、ロール配列、管理者フラグを含むオブジェクト
 */
export const getSessionInfo = (session: Session | null): SessionInfo => {
  // JWTコールバックで設定済みのorg_slugから直接取得
  const organizationSlug = session?.user?.tumiki?.org_slug ?? null;

  // JWTコールバックで設定済みのorg_idから直接取得
  const organizationId = session?.user?.tumiki?.org_id ?? null;

  const roles = session?.user?.tumiki?.roles ?? [];

  // ロール情報から管理者権限を判定
  // - 個人組織: getTumikiClaimsでOwnerロールが自動付与される
  // - チーム組織: Keycloakから渡されたロールを使用
  const isAdmin = hasAdminRole(roles);

  return {
    organizationSlug,
    organizationId,
    roles,
    isAdmin,
  };
};
