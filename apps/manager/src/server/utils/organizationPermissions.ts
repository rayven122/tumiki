import { TRPCError } from "@trpc/server";

/**
 * 固定組織ロール
 */
export type OrganizationRole = "Owner" | "Admin" | "Member" | "Viewer";

/**
 * 権限定義
 */
export type Permission =
  | "org:delete" // 組織削除
  | "org:update" // 組織更新
  | "member:invite" // メンバー招待
  | "member:remove" // メンバー削除
  | "member:role:update" // ロール変更
  | "role:create" // カスタムロール作成
  | "role:delete" // カスタムロール削除
  | "mcp:create" // MCPサーバー作成
  | "mcp:delete"; // MCPサーバー削除

/**
 * ロールごとの権限マッピング
 */
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  Owner: [
    "org:delete",
    "org:update",
    "member:invite",
    "member:remove",
    "member:role:update",
    "role:create",
    "role:delete",
    "mcp:create",
    "mcp:delete",
  ],
  Admin: [
    "org:update",
    "member:invite",
    "member:remove",
    "member:role:update",
    "mcp:create",
    "mcp:delete",
  ],
  Member: ["mcp:create"],
  Viewer: [],
};

/**
 * 組織情報の型（CurrentOrgと同じ構造）
 */
export type OrganizationInfo = {
  id: string;
  slug: string;
  createdBy: string;
  isPersonal: boolean;
  roles: string[]; // JWTから取得したロール配列 ["Owner", "Engineering Manager", ...]
};

/**
 * 組織アクセス検証のオプション
 */
export type OrganizationAccessOptions = {
  /** 管理者権限が必要か（Owner/Admin） */
  requireAdmin?: boolean;
  /** チーム（個人不可）が必要か */
  requireTeam?: boolean;
  /** 特定の権限が必要か */
  requirePermission?: Permission;
};

/**
 * 型ガード関数: 文字列が組織ロールかをチェック
 *
 * @param role - チェックする文字列
 * @returns OrganizationRole型である場合はtrue
 */
const isOrganizationRole = (role: string): role is OrganizationRole => {
  return ["Owner", "Admin", "Member", "Viewer"].includes(role);
};

/**
 * 固定ロールで権限をチェック
 *
 * @param roles - ユーザーのロール配列
 * @param permission - チェックする権限
 * @returns 権限がある場合はtrue
 */
export const checkPermission = (
  roles: string[],
  permission: Permission,
): boolean => {
  // 型ガードを使用して安全にフィルタリング
  const userFixedRoles = roles.filter(isOrganizationRole);

  return userFixedRoles.some((role) =>
    ROLE_PERMISSIONS[role]?.includes(permission),
  );
};

/**
 * 管理者権限をチェック（Owner または Admin）
 *
 * @param roles - ユーザーのロール配列
 * @returns 管理者権限がある場合はtrue
 */
export const isAdmin = (roles: string[]): boolean => {
  return roles.some((role) => role === "Owner" || role === "Admin");
};

/**
 * 組織のアクセス権限を検証する
 *
 * protectedProcedureのcontextから取得した組織データを使用し、
 * データベースクエリを実行せずに検証を行う
 *
 * @param organization - 組織データ（ctx.currentOrgから取得）
 * @param options - 検証オプション
 * @returns 組織情報
 *
 * @example
 * // 基本的なアクセス検証
 * validateOrganizationAccess(ctx.currentOrg);
 *
 * @example
 * // 管理者権限が必要な場合
 * validateOrganizationAccess(ctx.currentOrg, { requireAdmin: true });
 *
 * @example
 * // 特定の権限が必要な場合
 * validateOrganizationAccess(ctx.currentOrg, {
 *   requirePermission: "member:invite"
 * });
 *
 * @example
 * // チームの管理者権限が必要な場合（個人は不可）
 * validateOrganizationAccess(ctx.currentOrg, {
 *   requireAdmin: true,
 *   requireTeam: true,
 * });
 */
export const validateOrganizationAccess = (
  organization: OrganizationInfo | null,
  options: OrganizationAccessOptions = {},
) => {
  const {
    requireAdmin: shouldRequireAdmin = false,
    requireTeam = false,
    requirePermission,
  } = options;

  // 組織データの存在確認
  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "チームが見つかりません",
    });
  }

  // チームチェック（個人不可）
  if (requireTeam && organization.isPersonal) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "個人ではメンバー管理機能は利用できません",
    });
  }

  // 管理者権限チェック
  if (shouldRequireAdmin) {
    // 個人組織は常に管理者
    if (!organization.isPersonal && !isAdmin(organization.roles)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この操作を行う権限がありません",
      });
    }
  }

  // 特定権限チェック
  if (requirePermission) {
    // 個人組織は全権限を持つ
    if (
      !organization.isPersonal &&
      !checkPermission(organization.roles, requirePermission)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この操作を行う権限がありません",
      });
    }
  }

  return {
    organization,
  };
};
