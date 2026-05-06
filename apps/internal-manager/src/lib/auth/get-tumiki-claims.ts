import type {
  PrismaClient,
  PrismaTransactionClient,
} from "@tumiki/internal-db";
import { GroupSource, SyncStatus, SyncTrigger } from "@tumiki/internal-db";
import type { TumikiClaims } from "./types";

type TumikiClaimsDb = PrismaClient | PrismaTransactionClient;

const runInTransaction = <T>(
  client: TumikiClaimsDb,
  callback: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> => {
  // PrismaClient は $transaction を持ち、PrismaTransactionClient は持たない。
  // 既存 transaction 内から呼ばれた場合は、渡された tx をそのまま使って二重ネストを避ける。
  if ("$transaction" in client && typeof client.$transaction === "function") {
    return client.$transaction(callback);
  }
  return callback(client);
};

const getMappedProviders = (provider: string): string[] => [
  ...new Set([provider, "scim", `${provider}-map`, "scim-map"]),
];

const getJitManagedProviders = (provider: string): string[] => [
  ...new Set([provider, `${provider}-map`, "scim-map"]),
];

/**
 * ログイン時のJITグループ同期とTumikiクレーム取得
 *
 * - ExternalIdentityのupsert（provider + oidcSub → userId マッピング）
 * - IDPグループクレームに基づくUserGroupMembershipの差分更新
 * - IdpSyncLogへの記録
 * - User.lastLoginAt更新
 *
 * @param db Prismaクライアント（トランザクション内でも可）
 * @param userId Auth.js が生成する内部ユーザーID（User.id）
 * @param provider OIDCプロバイダーID（例: "oidc", "keycloak"）
 * @param oidcSub OIDCトークンのsub claim（ExternalIdentity管理用）
 * @param groupRoles OIDCトークンのグループクレーム（undefinedの場合は同期をスキップ）
 */
export const getTumikiClaims = async (
  db: TumikiClaimsDb,
  userId: string,
  provider: string,
  oidcSub: string,
  groupRoles: string[] | undefined,
): Promise<TumikiClaims | null> => {
  const user = await db.user
    .findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    })
    .catch((error: unknown) => {
      console.error("[getTumikiClaims] user.findUnique failed:", error);
      return null;
    });

  if (!user) return null;
  if (!user.isActive) return null;

  // グループ同期が失敗してもログイン実績は残すため、同期処理とは別に更新する。
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
    select: { id: true },
  });

  // ExternalIdentity の upsert（lastSyncedAt は @updatedAt で自動更新）
  if (oidcSub !== "") {
    await db.externalIdentity.upsert({
      where: { provider_sub: { provider, sub: oidcSub } },
      create: { userId, provider, sub: oidcSub },
      update: {},
    });
  }

  // JIT グループ同期
  let added = 0;
  let removed = 0;
  let syncStatus: SyncStatus = SyncStatus.SUCCESS;
  let syncError: string | null = null;

  if (groupRoles === undefined) {
    await db.idpSyncLog.create({
      data: {
        trigger: SyncTrigger.JIT,
        status: syncStatus,
        added,
        removed,
        detail: "Skipped because the OIDC group_roles claim was not returned.",
        completedAt: new Date(),
      },
    });

    return {
      org_slugs: [],
      org_id: null,
      org_slug: null,
      roles: [user.role],
      group_roles: undefined,
    };
  }

  try {
    const mappedProviders = getMappedProviders(provider);
    const jitManagedProviders = getJitManagedProviders(provider);
    // DB に登録済み、または Tumiki group に mapping 済みのグループを取得する。
    // SCIM で取り込んだグループは provider=scim、Tumiki group への
    // mapping は provider=scim-map / <provider>-map で保持する。
    const mappedGroups =
      groupRoles.length > 0
        ? await db.group.findMany({
            where: {
              provider: { in: mappedProviders },
              externalId: { in: groupRoles },
            },
            select: { id: true },
          })
        : [];

    const targetGroupIds = new Set(mappedGroups.map((g) => g.id));

    // 現在の IDP 由来メンバーシップを取得
    const currentMemberships = await db.userGroupMembership.findMany({
      where: {
        userId,
        source: GroupSource.IDP,
        group: {
          // provider=scim の所属はSCIMイベントが権威なので、JITログイン時の削除対象から外す。
          provider: { in: jitManagedProviders },
        },
      },
      select: { id: true, groupId: true },
    });

    const currentGroupIds = new Set(currentMemberships.map((m) => m.groupId));

    const toAdd = [...targetGroupIds].filter((id) => !currentGroupIds.has(id));
    const toRemove = currentMemberships.filter(
      (m) => !targetGroupIds.has(m.groupId),
    );

    if (toAdd.length > 0 || toRemove.length > 0) {
      await runInTransaction(db, async (tx) => {
        if (toAdd.length > 0) {
          await tx.userGroupMembership.createMany({
            data: toAdd.map((groupId) => ({
              userId,
              groupId,
              source: GroupSource.IDP,
            })),
            skipDuplicates: true,
          });
        }

        if (toRemove.length > 0) {
          await tx.userGroupMembership.deleteMany({
            where: { id: { in: toRemove.map((m) => m.id) } },
          });
        }
      });
    }
    added = toAdd.length;
    removed = toRemove.length;
  } catch (error) {
    syncError = error instanceof Error ? error.message : String(error);
    console.error("[getTumikiClaims] JIT sync failed:", error);
    syncStatus = SyncStatus.FAILED;
  }

  await db.idpSyncLog.create({
    data: {
      trigger: SyncTrigger.JIT,
      status: syncStatus,
      added,
      removed,
      errors: syncStatus === SyncStatus.FAILED ? 1 : 0,
      detail: syncError,
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
