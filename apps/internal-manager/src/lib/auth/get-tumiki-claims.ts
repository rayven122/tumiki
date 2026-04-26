import type { PrismaTransactionClient } from "@tumiki/internal-db";
import { GroupSource, SyncStatus, SyncTrigger } from "@tumiki/internal-db";
import type { TumikiClaims } from "./types";

/**
 * ログイン時のJITグループ同期とTumikiクレーム取得
 *
 * - ExternalIdentityのupsert（provider + sub → userId マッピング）
 * - IDPグループクレームに基づくUserGroupMembershipの差分更新
 * - IdpSyncLogへの記録
 * - User.lastLoginAt更新・isActive復元
 *
 * @param db Prismaクライアント（トランザクション内でも可）
 * @param userId ユーザーID（OIDC sub = User.id）
 * @param provider OIDCプロバイダーID（例: "oidc", "keycloak"）
 * @param groupRoles OIDCトークンのグループクレーム（Group.externalIdと対応）
 */
export const getTumikiClaims = async (
  db: PrismaTransactionClient,
  userId: string,
  provider: string,
  groupRoles: string[] | undefined = [],
): Promise<TumikiClaims | null> => {
  const user = await db.user
    .update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), isActive: true },
      select: { id: true, role: true },
    })
    .catch(() => null);

  if (!user) return null;

  // ExternalIdentity の upsert（lastSyncedAt は @updatedAt で自動更新）
  await db.externalIdentity.upsert({
    where: { provider_sub: { provider, sub: userId } },
    create: { userId, provider, sub: userId },
    update: {},
  });

  // JIT グループ同期
  let added = 0;
  let removed = 0;
  let syncStatus: SyncStatus = SyncStatus.SUCCESS;

  try {
    // DB に登録済みの IDP グループのうち、今回のクレームに含まれるものを取得
    const idpGroups =
      groupRoles.length > 0
        ? await db.group.findMany({
            where: {
              source: GroupSource.IDP,
              provider,
              externalId: { in: groupRoles },
            },
            select: { id: true },
          })
        : [];

    const targetGroupIds = new Set(idpGroups.map((g) => g.id));

    // 現在の IDP 由来メンバーシップを取得
    const currentMemberships = await db.userGroupMembership.findMany({
      where: {
        userId,
        source: GroupSource.IDP,
        group: { provider, source: GroupSource.IDP },
      },
      select: { id: true, groupId: true },
    });

    const currentGroupIds = new Set(currentMemberships.map((m) => m.groupId));

    const toAdd = [...targetGroupIds].filter((id) => !currentGroupIds.has(id));
    const toRemove = currentMemberships.filter(
      (m) => !targetGroupIds.has(m.groupId),
    );

    if (toAdd.length > 0) {
      await db.userGroupMembership.createMany({
        data: toAdd.map((groupId) => ({
          userId,
          groupId,
          source: GroupSource.IDP,
        })),
        skipDuplicates: true,
      });
      added = toAdd.length;
    }

    if (toRemove.length > 0) {
      await db.userGroupMembership.deleteMany({
        where: { id: { in: toRemove.map((m) => m.id) } },
      });
      removed = toRemove.length;
    }
  } catch (error) {
    console.error("[getTumikiClaims] JIT sync failed:", error);
    syncStatus = SyncStatus.FAILED;
  }

  await db.idpSyncLog.create({
    data: {
      trigger: SyncTrigger.JIT,
      status: syncStatus,
      added,
      removed,
      completedAt: new Date(),
    },
  });

  return {
    org_slugs: [],
    org_id: null,
    org_slug: null,
    roles: [user.role],
    group_roles: groupRoles,
  };
};
