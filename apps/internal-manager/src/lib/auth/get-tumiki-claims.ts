import type { PrismaTransactionClient } from "@tumiki/db";
import type { TumikiClaims } from "./types";

/**
 * 認証用にtumikiクレームを取得（Registry用簡素版）
 *
 * Registryでは組織機能を使用しないため、ユーザー存在確認のみ行う
 *
 * @param db Prismaクライアント
 * @param userId ユーザーID（Keycloak sub）
 * @param groupRoles Keycloakのgroup_roles（グループパス配列） - 未使用だが将来の拡張のため保持
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
