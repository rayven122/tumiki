import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";
import { db } from "@tumiki/internal-db/server";
import { GroupSource, SyncStatus, SyncTrigger } from "@tumiki/internal-db";

/// SCIM経由で同期されたユーザー/グループの provider 識別子
export const SCIM_PROVIDER = "scim" as const;

const isUser = (
  data: DirectorySyncEvent["data"],
): data is Extract<DirectorySyncEvent["data"], { email: string }> =>
  "email" in data && "first_name" in data;

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
        await db.user.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            email: data.email || null,
            name: buildDisplayName(data.first_name, data.last_name),
            isActive: data.active,
            externalIdentities: {
              create: { provider: SCIM_PROVIDER, sub: data.id },
            },
          },
          update: {
            email: data.email || null,
            name: buildDisplayName(data.first_name, data.last_name),
            isActive: data.active,
          },
        });
        added = 1;
        break;
      }

      case "user.updated": {
        if (!isUser(data)) break;
        await db.user.update({
          where: { id: data.id },
          data: {
            email: data.email || null,
            name: buildDisplayName(data.first_name, data.last_name),
            isActive: data.active,
          },
        });
        break;
      }

      case "user.deleted": {
        if (!isUser(data)) break;
        // ソフト削除（履歴・権限追跡のため物理削除しない）
        await db.user.update({
          where: { id: data.id },
          data: { isActive: false },
        });
        removed = 1;
        break;
      }

      case "group.created": {
        if (!isGroup(data)) break;
        const created = await db.group.create({
          data: {
            id: data.id,
            name: data.name,
            source: GroupSource.IDP,
            provider: SCIM_PROVIDER,
            externalId: data.id,
            lastSyncedAt: new Date(),
          },
        });
        groupId = created.id;
        break;
      }

      case "group.updated": {
        if (!isGroup(data)) break;
        const updated = await db.group.update({
          where: { id: data.id },
          data: { name: data.name, lastSyncedAt: new Date() },
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
        const result = await db.userGroupMembership.upsert({
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
        await db.group.update({
          where: { id: data.group.id },
          data: { lastSyncedAt: new Date() },
        });
        // 戻り値の参照警告を避ける
        void result;
        break;
      }

      case "group.user_removed": {
        if (!isUserWithGroup(data)) break;
        const del = await db.userGroupMembership.deleteMany({
          where: { userId: data.id, groupId: data.group.id },
        });
        groupId = data.group.id;
        removed = del.count;
        await db.group.update({
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
};
