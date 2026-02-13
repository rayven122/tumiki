import type { PrismaTransactionClient } from "@tumiki/db";
import type { TumikiClaims } from "@/lib/auth/types";

/**
 * 認証用にtumikiクレームを取得
 *
 * JWT callback で使用するために、DBから組織メンバーシップ情報を取得して
 * tumikiクレーム構造を生成する
 *
 * ロール決定ロジック:
 * - 個人組織（isPersonal=true）: DBのフラグを見て Owner ロールを自動付与
 * - チーム組織: Keycloakから渡されたロールをそのまま使用
 *
 * @param db Prismaクライアント
 * @param userId ユーザーID（Keycloak sub）
 * @param roles Keycloakのroles（ロール配列）- チーム組織で使用
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
            select: { id: true, slug: true, isPersonal: true },
          },
        },
      },
    },
  });

  // ユーザーが見つからない、または組織メンバーシップがない場合
  if (!user || user.members.length === 0) {
    return null;
  }

  // DBから取得した組織slugリストを構築
  const orgSlugs = user.members.map(
    (membership) => membership.organization.slug,
  );

  // デフォルト組織を決定
  let defaultOrg = user.defaultOrganization;

  // デフォルト組織が設定されていない、または実際のメンバーシップに含まれていない場合
  if (
    !defaultOrg ||
    !user.members.some((m) => m.organization.id === defaultOrg!.id)
  ) {
    // 個人組織を探す
    const personalOrg = user.members.find((m) => m.organization.isPersonal);

    if (!personalOrg) {
      throw new Error(
        `User ${userId} does not have a personal organization. This should not happen.`,
      );
    }

    // 個人組織をデフォルトに設定
    defaultOrg = {
      id: personalOrg.organization.id,
      slug: personalOrg.organization.slug,
    };

    // DBのdefaultOrganizationSlugも更新
    await db.user.update({
      where: { id: userId },
      data: { defaultOrganizationSlug: personalOrg.organization.slug },
    });
  }

  // デフォルト組織が個人組織かどうかを判定
  const isDefaultOrgPersonal =
    user.members.find((m) => m.organization.id === defaultOrg.id)?.organization
      .isPersonal ?? false;

  // ロール決定:
  // - 個人組織: Owner ロールのみ（Keycloakグループを作成しないため）
  // - チーム組織: Keycloakから渡されたロールをそのまま使用
  const userRoles = isDefaultOrgPersonal ? ["Owner"] : (roles ?? []);

  return {
    org_slugs: orgSlugs,
    org_id: defaultOrg.id,
    org_slug: defaultOrg.slug,
    roles: userRoles,
  };
};
