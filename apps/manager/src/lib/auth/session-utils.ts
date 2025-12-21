import type { Session } from "next-auth";

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
 * group_rolesから個人組織のslugを取得
 * 個人組織のslugは@で始まる
 *
 * @param groupRoles - Keycloakのgroup_roles配列
 * @returns 個人組織のslug、見つからない場合はnull
 */
export const getPersonalOrgSlug = (groupRoles: string[]): string | null => {
  return groupRoles.find((slug) => slug.startsWith("@")) ?? null;
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
  const isAdmin = roles.some((role) => role === "Owner" || role === "Admin");

  return {
    organizationSlug,
    organizationId,
    roles,
    isAdmin,
  };
};
