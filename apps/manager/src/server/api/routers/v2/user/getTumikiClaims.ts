import { getPersonalOrgSlug } from "@/lib/auth/session-utils";
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

  // 既存ユーザー: group_rolesから個人組織のslugを取得（@で始まるものが個人組織）
  const personalOrgSlug = getPersonalOrgSlug(groupRoles);
  if (!personalOrgSlug) {
    return {
      org_slugs: groupRoles,
      org_id: null,
      org_slug: null,
      roles,
    };
  }

  const personalOrg = await db.organization.findUnique({
    where: { slug: personalOrgSlug },
    select: { id: true, slug: true },
  });

  return {
    org_slugs: groupRoles,
    org_id: personalOrg?.id ?? null,
    org_slug: personalOrg?.slug ?? null,
    roles,
  };
};
