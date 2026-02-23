import type { PrismaTransactionClient } from "@tumiki/db";
import type { TumikiClaims } from "@/lib/auth/types";

/**
 * ロールサブグループ名のプレフィックス
 * Keycloakのグループパス形式: /{slug}/_Owner, /{slug}/_Admin など
 * ※ slugは組織のスラッグ（groupName）
 */
const ROLE_SUBGROUP_PREFIX = "_";

/**
 * group_rolesパスから組織別ロールを抽出
 *
 * @param groupRoles - Keycloakのgroup_rolesクレーム（例: ["/rayven/_Owner", "/acme/_Member"]）
 * @param orgSlug - 対象の組織スラッグ
 * @returns 組織に対するロール配列（例: ["Owner"]）、該当なしの場合は空配列
 */
export const parseOrgRolesFromGroupPaths = (
  groupRoles: string[],
  orgSlug: string,
): string[] => {
  // 組織グループパスのプレフィックス（例: "/rayven/"）
  const orgGroupPrefix = `/${orgSlug}/`;

  return groupRoles
    .filter((path) => path.startsWith(orgGroupPrefix))
    .map((path) => {
      // パスからロールサブグループ名を抽出（例: "/rayven/_Owner" → "_Owner"）
      const subgroupName = path.slice(orgGroupPrefix.length);
      // ネストしたパスは無視（スラッシュが含まれている場合は組織直下のサブグループではない）
      if (subgroupName.includes("/")) {
        return null;
      }
      // プレフィックスを除去してロール名を取得（例: "_Owner" → "Owner"）
      if (subgroupName.startsWith(ROLE_SUBGROUP_PREFIX)) {
        return subgroupName.slice(ROLE_SUBGROUP_PREFIX.length);
      }
      return null;
    })
    .filter((role): role is string => role !== null);
};

/**
 * 認証用にtumikiクレームを取得
 *
 * JWT callback で使用するために、DBから組織メンバーシップ情報を取得して
 * tumikiクレーム構造を生成する
 *
 * ロール決定ロジック:
 * - 個人組織（isPersonal=true）: DBのフラグを見て Owner ロールを自動付与
 * - チーム組織: group_rolesから組織別ロールを抽出（Keycloakグループロールマッピング方式）
 *
 * @param db Prismaクライアント
 * @param userId ユーザーID（Keycloak sub）
 * @param groupRoles Keycloakのgroup_roles（グループパス配列）- 組織別ロール解析に使用
 * @returns tumikiクレームまたはnull
 */
export const getTumikiClaims = async (
  db: PrismaTransactionClient,
  userId: string,
  groupRoles: string[] | undefined = [],
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
  // - チーム組織: group_rolesから組織別ロールを抽出
  const userRoles = isDefaultOrgPersonal
    ? ["Owner"]
    : parseOrgRolesFromGroupPaths(groupRoles ?? [], defaultOrg.slug);

  return {
    org_slugs: orgSlugs,
    org_id: defaultOrg.id,
    org_slug: defaultOrg.slug,
    roles: userRoles,
  };
};
