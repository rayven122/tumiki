import type { PrismaTransactionClient } from "@tumiki/db";
import type { TumikiClaims } from "~/lib/auth/types";

/**
 * 認証用にtumikiクレームを取得
 *
 * JWT callback で使用するために、DBから組織メンバーシップ情報を取得して
 * tumikiクレーム構造を生成する
 *
 * @param db Prismaクライアント
 * @param userId ユーザーID（Keycloak sub）
 * @param roles Keycloakのroles（ロール配列）- 将来的に使用する可能性あり
 * @returns tumikiクレームまたはnull
 */
export const getTumikiClaims = async (
  db: PrismaTransactionClient,
  userId: string,
  roles: string[] | undefined = [],
): Promise<TumikiClaims | null> => {
  // DBからユーザーのdefaultOrganizationと組織メンバーシップを取得
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      defaultOrganization: {
        select: { id: true, slug: true },
      },
      members: {
        where: {
          organization: {
            isDeleted: false,
          },
        },
        select: {
          organization: {
            select: { slug: true },
          },
        },
      },
    },
  });

  // ユーザーが見つからない、または組織メンバーシップがない場合
  if (!user || user.members.length === 0) {
    return null;
  }

  // 組織作成後に必ずdefaultOrganizationSlugが設定されるため、
  // 存在しない場合はデータ不整合としてエラーをスロー
  const defaultOrg = user.defaultOrganization;
  if (!defaultOrg) {
    throw new Error(
      `User ${userId} does not have a default organization. This should not happen.`,
    );
  }

  // DBから取得した組織slugリストを構築
  const orgSlugs = user.members.map(
    (membership) => membership.organization.slug,
  );

  return {
    org_slugs: orgSlugs,
    org_id: defaultOrg.id,
    org_slug: defaultOrg.slug,
    roles,
  };
};
