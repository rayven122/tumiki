import type { PrismaTransactionClient } from "@tumiki/db";
import type { TumikiClaims } from "~/lib/auth/types";

/**
 * 認証用にtumikiクレームを取得
 *
 * JWT callback で使用するために、Keycloakのgroup_rolesとrolesから
 * tumikiクレーム構造を生成する
 *
 * @param db Prismaクライアント
 * @param userId ユーザーID（Keycloak sub）
 * @param groupRoles Keycloakのgroup_roles（組織slug配列）
 * @param roles Keycloakのroles（ロール配列）
 * @returns tumikiクレームまたはnull
 */
export const getTumikiClaims = async (
  db: PrismaTransactionClient,
  userId: string,
  groupRoles: string[] | undefined,
  roles: string[] | undefined = [],
): Promise<TumikiClaims | null> => {
  // 初回登録時: group_rolesがまだKeycloakのjwtに含まれていない
  // createUserで個人組織はDBに作成済みなので、DBから取得
  if (!groupRoles) {
    const membership = await db.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          isPersonal: true,
        },
      },
      select: {
        organization: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      org_slugs: [membership.organization.slug],
      org_id: membership.organization.id,
      org_slug: membership.organization.slug,
      roles,
    };
  }

  // ユーザーのdefaultOrganizationを取得
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      defaultOrganization: {
        select: { id: true, slug: true },
      },
    },
  });

  // 組織作成後に必ずdefaultOrganizationSlugが設定されるため、
  // 存在しない場合はデータ不整合としてエラーをスロー
  const defaultOrg = user?.defaultOrganization;
  if (!defaultOrg) {
    throw new Error(
      `User ${userId} does not have a default organization. This should not happen.`,
    );
  }

  return {
    org_slugs: groupRoles,
    org_id: defaultOrg.id,
    org_slug: defaultOrg.slug,
    roles,
  };
};
