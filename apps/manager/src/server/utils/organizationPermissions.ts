import { TRPCError } from "@trpc/server";

/**
 * 固定組織ロール
 *
 * このファイルは組織全体の基本的な権限（Owner/Admin/Member/Viewer）を管理します。
 * リソース別の細粒度権限（MCPサーバーなど）については、
 * 将来的にデータベースのUnix型権限システム（RolePermission）を使用します。
 *
 * @see /docs/auth/permission-guide.md - 権限システム全体の設計
 */
export type OrganizationRole = "Owner" | "Admin" | "Member" | "Viewer";

/**
 * 割り当て可能なロール（招待・変更時に使用）
 *
 * Ownerロールは組織作成者のみが持つ特別なロールであり、
 * 招待やロール変更で割り当てることはできません。
 */
export type AssignableRole = "Admin" | "Member" | "Viewer";

/**
 * 権限定義（組織操作・管理権限）
 */
export type Permission =
  // 組織管理
  | "org:delete" // 組織削除（Ownerのみ）
  | "org:update" // 組織設定更新
  // メンバー管理
  | "member:read" // メンバー一覧閲覧
  | "member:invite" // メンバー招待
  | "member:remove" // メンバー削除
  | "member:role:update" // ロール変更
  // ロール管理（カスタムロール）
  | "role:manage" // ロール管理（作成・更新・削除・権限管理）
  // MCP管理
  | "mcp:create" // MCPサーバー作成
  | "mcp:delete" // MCPサーバー削除
  | "mcp:use" // MCPサーバー利用
  // グループ管理
  | "group:read" // グループ一覧閲覧
  | "group:manage"; // グループ管理（作成・削除・メンバー管理）

/**
 * ロールごとの権限マッピング
 */
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  Owner: [
    "org:delete",
    "org:update",
    "member:read",
    "member:invite",
    "member:remove",
    "member:role:update",
    "group:read",
    "group:manage",
    "role:manage",
    "mcp:create",
    "mcp:delete",
    "mcp:use",
  ],
  Admin: [
    "org:update",
    "member:read",
    "member:invite",
    "member:remove",
    "member:role:update",
    "group:read",
    "group:manage",
    "mcp:create",
    "mcp:delete",
    "mcp:use",
  ],
  Member: ["member:read", "group:read", "mcp:create"],
  Viewer: ["member:read", "group:read"],
};

/**
 * 組織情報の型（protectedProcedureのctx.currentOrgから取得）
 *
 * roles配列にはKeycloakのRealm Roleが含まれます：
 * - 固定ロール: "Owner", "Admin", "Member", "Viewer"
 * - カスタムロール: "org:{orgSlug}:role:{roleSlug}"形式（将来実装予定）
 */
export type OrganizationInfo = {
  id: string;
  slug: string;
  createdBy: string;
  isPersonal: boolean;
  roles: string[]; // JWTから取得したロール配列
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
