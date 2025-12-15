import { TRPCError } from "@trpc/server";

/**
 * 組織情報の型（CurrentOrgと同じ構造）
 */
export type OrganizationInfo = {
  id: string;
  createdBy: string;
  isPersonal: boolean;
  isAdmin: boolean; // 現在のユーザーの管理者権限
};

/**
 * 組織アクセス検証のオプション
 */
export type OrganizationAccessOptions = {
  /** 管理者権限が必要か */
  requireAdmin?: boolean;
  /** チーム（個人不可）が必要か */
  requireTeam?: boolean;
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
  const { requireAdmin = false, requireTeam = false } = options;

  // 組織データの存在確認
  if (!organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "チームが見つかりません",
    });
  }

  // 管理者権限チェック
  if (requireAdmin && !organization.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この操作を行う権限がありません",
    });
  }

  // チームチェック（個人不可）
  if (requireTeam && organization.isPersonal) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "個人ではメンバー管理機能は利用できません",
    });
  }

  return {
    organization,
  };
};
