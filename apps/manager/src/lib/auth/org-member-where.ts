import type { Prisma } from "@tumiki/db/prisma";

/**
 * Desktop の組織メンバーシップ検索用 where 句を構築する
 *
 * orgSlug が指定されていればその組織を、未指定（Keycloak group_roles なし）の場合は
 * ユーザーの全所属組織のうち最古のものをデフォルトとして選択するための条件を返す。
 * 利用側は `orderBy: { createdAt: "asc" }, take: 1` と組み合わせて使う。
 */
export const buildOrgMemberWhere = (
  userId: string,
  orgSlug: string | null,
): Prisma.OrganizationMemberWhereInput =>
  orgSlug ? { userId, organization: { slug: orgSlug } } : { userId };
