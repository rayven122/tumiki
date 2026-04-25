import type { PrismaTransactionClient } from "@tumiki/internal-db";
import type { TumikiClaims } from "./types";

/**
 * 認証用にtumikiクレームを取得（internal-manager用簡素版）
 *
 * 組織機能はPhase 2で実装予定のため、現時点ではユーザー存在確認のみ行う。
 * group_rolesはOIDCプロバイダーのカスタムクレームまたはDB同期から取得し、将来の拡張のため保持。
 *
 * @param db Prismaクライアント
 * @param userId ユーザーID（OIDC sub）
 * @param groupRoles OIDCプロバイダーのgroup_roles（将来のGBAC実装用）
 * @returns tumikiクレームまたはnull
 */
export const getTumikiClaims = async (
  db: PrismaTransactionClient,
  userId: string,
  groupRoles: string[] | undefined = [],
): Promise<TumikiClaims | null> => {
  // DBからユーザーを取得
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
    },
  });

  // ユーザーが見つからない場合
  if (!user) {
    return null;
  }

  // 組織機能なしの最小クレーム
  return {
    org_slugs: [],
    org_id: null,
    org_slug: null,
    roles: [],
    group_roles: groupRoles, // 将来の拡張のため保存
  };
};
