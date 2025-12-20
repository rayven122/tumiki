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
 * セッションから組織関連情報を取得する統合関数
 * Keycloakのtumiki claimsから必要な情報を抽出してオブジェクトで返す
 *
 * @param session - Next-Authセッションオブジェクト
 * @returns 組織slug、組織ID、ロール配列、管理者フラグを含むオブジェクト
 *
 * @example
 * ```typescript
 * // 必要な値だけ分割代入で取得
 * const { organizationSlug } = getSessionInfo(session);
 * const { isAdmin } = getSessionInfo(session);
 * const { organizationId, roles } = getSessionInfo(session);
 *
 * // すべての値を取得
 * const sessionInfo = getSessionInfo(session);
 * ```
 */
export const getSessionInfo = (session: Session | null): SessionInfo => {
  // organization_groupパスから最後のセグメントを抽出してslugとする
  // 例: "/tumiki/org-slug" → "org-slug"
  const organizationGroup = session?.user?.tumiki?.organization_group;
  const organizationSlug = organizationGroup
    ? (organizationGroup.split("/").filter(Boolean).pop() ?? null)
    : null;

  const organizationId = session?.user?.tumiki?.organization_id ?? null;
  const roles = session?.user?.tumiki?.roles ?? [];
  const isAdmin = roles.some((role) => role === "Owner" || role === "Admin");

  return {
    organizationSlug,
    organizationId,
    roles,
    isAdmin,
  };
};
