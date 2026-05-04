import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";
import { db } from "@tumiki/internal-db/server";
import {
  GroupSource,
  OrgUnitSource,
  type PrismaTransactionClient,
  SyncStatus,
  SyncTrigger,
} from "@tumiki/internal-db";

// SCIM経由で同期されたユーザー/グループの provider 識別子
export const SCIM_PROVIDER = "scim" as const;

// 注: first_name はオプショナル属性のため判定に含めない（Okta等で省略される場合あり）
const isUser = (
  data: DirectorySyncEvent["data"],
): data is Extract<DirectorySyncEvent["data"], { email: string }> =>
  "email" in data;

const isGroup = (
  data: DirectorySyncEvent["data"],
): data is Extract<DirectorySyncEvent["data"], { name: string }> =>
  "name" in data && !("email" in data);

const isUserWithGroup = (
  data: DirectorySyncEvent["data"],
): data is Extract<DirectorySyncEvent["data"], { group: { id: string } }> =>
  "group" in data && "email" in data;

const buildDisplayName = (firstName?: string, lastName?: string) => {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
};

const ENTERPRISE_USER_SCHEMA =
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User";

type EnterpriseUserAttributes = {
  department: string | null;
  managerValue: string | null;
  managerDisplayName: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

const extractEnterpriseUserAttributes = (
  data: DirectorySyncEvent["data"],
): EnterpriseUserAttributes => {
  const root = asRecord(data);
  const extension = asRecord(root[ENTERPRISE_USER_SCHEMA]);
  const manager = asRecord(root.manager ?? extension.manager);

  return {
    department: stringOrNull(root.department ?? extension.department),
    managerValue: stringOrNull(manager.value),
    managerDisplayName: stringOrNull(manager.displayName),
  };
};

const normalizeExternalId = (name: string) =>
  `department:${encodeURIComponent(name.trim().toLowerCase()).replace(
    /%20/g,
    "-",
  )}`;

const syncPrimaryOrgUnitMembership = async (
  tx: PrismaTransactionClient,
  userId: string,
  attributes: EnterpriseUserAttributes,
) => {
  if (!attributes.department) return;

  const externalId = normalizeExternalId(attributes.department);
  const orgUnit = await tx.orgUnit.upsert({
    where: {
      source_externalId: {
        source: OrgUnitSource.SCIM,
        externalId,
      },
    },
    create: {
      name: attributes.department,
      externalId,
      source: OrgUnitSource.SCIM,
      path: `/${externalId}`,
      lastSyncedAt: new Date(),
    },
    update: {
      name: attributes.department,
      lastSyncedAt: new Date(),
    },
  });

  await tx.userOrgUnitMembership.updateMany({
    where: {
      userId,
      isPrimary: true,
      orgUnitId: { not: orgUnit.id },
    },
    data: { isPrimary: false },
  });

  await tx.userOrgUnitMembership.upsert({
    where: {
      userId_orgUnitId: {
        userId,
        orgUnitId: orgUnit.id,
      },
    },
    create: {
      userId,
      orgUnitId: orgUnit.id,
      isPrimary: true,
    },
    update: {
      isPrimary: true,
    },
  });
};

// user.created と user.updated の両方で使う upsert ロジック
// （update のみだと P2025、create のみだと P2002 が出るため両イベントで同じ実装を共有）
type ScimUserData = Extract<DirectorySyncEvent["data"], { email: string }>;
const upsertScimUser = async (data: ScimUserData) => {
  const enterpriseAttributes = extractEnterpriseUserAttributes(data);
  await db.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email || null,
        name: buildDisplayName(data.first_name, data.last_name),
        isActive: data.active,
        scimDepartment: enterpriseAttributes.department,
        scimManagerValue: enterpriseAttributes.managerValue,
        scimManagerDisplayName: enterpriseAttributes.managerDisplayName,
        externalIdentities: {
          create: { provider: SCIM_PROVIDER, sub: data.id },
        },
      },
      update: {
        email: data.email || null,
        name: buildDisplayName(data.first_name, data.last_name),
        isActive: data.active,
        scimDepartment: enterpriseAttributes.department,
        scimManagerValue: enterpriseAttributes.managerValue,
        scimManagerDisplayName: enterpriseAttributes.managerDisplayName,
      },
    });
    await syncPrimaryOrgUnitMembership(tx, data.id, enterpriseAttributes);
  });
};

/**
 * Jackson Directory Sync の eventCallback
 *
 * SCIM リクエストが Jackson 内部で処理された後、ユーザー/グループの
 * 変更イベントが本コールバックに届く。内部DB（@tumiki/internal-db）に
 * 反映し、IdpSyncLog を記録する。
 *
 * 失敗時は throw せず IdpSyncLog に FAILED を残し、SCIM レスポンス自体は
 * 200 を返す（IdP側の再試行ループを防ぐ）。
 */
export const handleDirectorySyncEvent = async (
  event: DirectorySyncEvent,
): Promise<void> => {
  const { event: type, data } = event;
  let added = 0;
  let removed = 0;
  let groupId: string | null = null;
  let status: SyncStatus = SyncStatus.SUCCESS;
  let detail: string | null = null;

  try {
    switch (type) {
      case "user.created": {
        if (!isUser(data)) break;
        await upsertScimUser(data);
        added = 1;
        break;
      }

      case "user.updated": {
        if (!isUser(data)) break;
        // 過去に user.created がエラーで失敗していた場合に備えて upsert を使用
        // （update のみだと P2025 RecordNotFound で同期が永続的に失敗し続ける）
        await upsertScimUser(data);
        break;
      }

      case "user.deleted": {
        if (!isUser(data)) break;
        // ソフト削除（履歴・権限追跡のため物理削除しない）
        // user.created が過去に失敗していた場合に P2025 を出さないよう updateMany を使用
        // （0件マッチでも { count: 0 } を返すため冪等）
        const del = await db.user.updateMany({
          where: { id: data.id },
          data: { isActive: false },
        });
        removed = del.count;
        break;
      }

      case "group.created": {
        if (!isGroup(data)) break;
        // IdP のリトライ（タイムアウト後の再送等）で重複イベントが届いても
        // P2002 を出さないよう upsert を使用（user.created と同じ方針）
        const created = await db.group.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            name: data.name,
            source: GroupSource.IDP,
            provider: SCIM_PROVIDER,
            externalId: data.id,
            lastSyncedAt: new Date(),
          },
          update: {
            name: data.name,
            lastSyncedAt: new Date(),
          },
        });
        groupId = created.id;
        break;
      }

      case "group.updated": {
        if (!isGroup(data)) break;
        // 過去に group.created が失敗していた場合に備えて upsert を使用
        // （update のみだと P2025 RecordNotFound で同期が永続的に失敗し続ける）
        const updated = await db.group.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            name: data.name,
            source: GroupSource.IDP,
            provider: SCIM_PROVIDER,
            externalId: data.id,
            lastSyncedAt: new Date(),
          },
          update: { name: data.name, lastSyncedAt: new Date() },
        });
        groupId = updated.id;
        break;
      }

      case "group.deleted": {
        if (!isGroup(data)) break;
        const existing = await db.group.findUnique({
          where: { id: data.id },
          select: { id: true, memberships: { select: { id: true } } },
        });
        if (existing) {
          removed = existing.memberships.length;
          await db.group.delete({ where: { id: data.id } });
          groupId = data.id;
        }
        break;
      }

      case "group.user_added": {
        if (!isUserWithGroup(data)) break;
        await db.userGroupMembership.upsert({
          where: {
            userId_groupId: { userId: data.id, groupId: data.group.id },
          },
          create: {
            userId: data.id,
            groupId: data.group.id,
            source: GroupSource.IDP,
          },
          update: {},
        });
        groupId = data.group.id;
        added = 1;
        // group が削除済みでも P2025 を出さないよう updateMany を使用（冪等）
        await db.group.updateMany({
          where: { id: data.group.id },
          data: { lastSyncedAt: new Date() },
        });
        break;
      }

      case "group.user_removed": {
        if (!isUserWithGroup(data)) break;
        const del = await db.userGroupMembership.deleteMany({
          where: { userId: data.id, groupId: data.group.id },
        });
        groupId = data.group.id;
        removed = del.count;
        // group が削除済みでも P2025 を出さないよう updateMany を使用（冪等）
        await db.group.updateMany({
          where: { id: data.group.id },
          data: { lastSyncedAt: new Date() },
        });
        break;
      }

      default: {
        // 未知のイベントタイプは無視（Jacksonの将来追加に備えて throw しない）
        const _exhaustive: never = type;
        void _exhaustive;
      }
    }
  } catch (e) {
    status = SyncStatus.FAILED;
    detail = e instanceof Error ? e.message : String(e);
    console.error("[scim:event-handler]", type, detail);
  }

  // ログ書き込み失敗で event-handler が throw すると IdP に 500 が返って再試行される
  // → 重複プロビジョニングを防ぐためログ書き込みは別途 try-catch で吸収する
  try {
    await db.idpSyncLog.create({
      data: {
        groupId,
        trigger: SyncTrigger.SCIM,
        status,
        added,
        removed,
        errors: status === SyncStatus.FAILED ? 1 : 0,
        detail,
        completedAt: new Date(),
      },
    });
  } catch (logErr) {
    console.error("[scim:event-handler] idpSyncLog write failed:", logErr);
  }
};
