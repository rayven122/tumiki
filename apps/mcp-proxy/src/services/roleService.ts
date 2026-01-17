/**
 * ロール判定ユーティリティ
 *
 * 組織ロール（Owner/Admin/Member/Viewer）に基づく権限チェック関数を提供
 */

/**
 * 組織ロール型定義
 */
export type OrganizationRole = "Owner" | "Admin" | "Member" | "Viewer";

/**
 * 管理者権限をチェック（Owner または Admin）
 *
 * @param roles - JWTから取得したロール配列
 * @returns 管理者権限がある場合はtrue
 */
export const isAdmin = (roles: string[]): boolean => {
  return roles.some((role) => role === "Owner" || role === "Admin");
};

/**
 * 型ガード関数: 文字列が組織ロールかをチェック
 *
 * @param role - チェックする文字列
 * @returns OrganizationRole型である場合はtrue
 */
export const isOrganizationRole = (role: string): role is OrganizationRole => {
  return ["Owner", "Admin", "Member", "Viewer"].includes(role);
};
