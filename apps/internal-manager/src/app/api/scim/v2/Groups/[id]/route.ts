import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";
import { GroupSource, SyncStatus, SyncTrigger } from "@tumiki/internal-db";
import { validateScimAuth } from "~/lib/scim/auth";
import { formatGroup, scimError, scimResponse } from "~/lib/scim/formatters";
import { scimPatchOpSchema } from "~/lib/scim/schemas";

const GROUP_SELECT = {
  id: true,
  name: true,
  externalId: true,
  createdAt: true,
  updatedAt: true,
  memberships: {
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  },
} as const;

type RouteContext = { params: Promise<{ id: string }> };

/** "members[value eq \"userId\"]" 形式のフィルタパスからユーザーIDを取得 */
const parseMemberFilter = (path: string): string | null => {
  const match = /^members\[value\s+eq\s+"([^"]+)"\]$/i.exec(path);
  return match?.[1] ?? null;
};

/** グループ取得 */
export const GET = async (req: NextRequest, { params }: RouteContext) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { id } = await params;
  const group = await db.group.findUnique({
    where: { id },
    select: GROUP_SELECT,
  });
  if (!group) return scimError(404, "Group not found");

  return scimResponse(formatGroup(group, req.nextUrl.origin));
};

/** グループ更新（メンバー追加・削除・置換、displayName変更） */
export const PATCH = async (req: NextRequest, { params }: RouteContext) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { id } = await params;
  const existing = await db.group.findUnique({ where: { id } });
  if (!existing) return scimError(404, "Group not found");

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = scimPatchOpSchema.safeParse(rawBody);
  if (!parsed.success) {
    return scimError(400, parsed.error.message, "invalidValue");
  }

  let added = 0;
  let removed = 0;

  await db.$transaction(async (tx) => {
    for (const op of parsed.data.Operations) {
      const path = op.path?.toLowerCase();

      if (
        op.op === "replace" &&
        path === "displayname" &&
        typeof op.value === "string"
      ) {
        await tx.group.update({ where: { id }, data: { name: op.value } });
        continue;
      }

      // "members[value eq \"userId\"]" 形式のremove
      const memberUserId = op.path ? parseMemberFilter(op.path) : null;
      if (op.op === "remove" && memberUserId) {
        const del = await tx.userGroupMembership.deleteMany({
          where: { groupId: id, userId: memberUserId },
        });
        removed += del.count;
        continue;
      }

      if (path === "members" || (!path && !memberUserId)) {
        const memberValues = Array.isArray(op.value)
          ? (op.value as { value: string }[]).map((m) => m.value)
          : [];

        if (op.op === "add" && memberValues.length > 0) {
          const validUsers = await tx.user.findMany({
            where: { id: { in: memberValues } },
            select: { id: true },
          });
          if (validUsers.length > 0) {
            const result = await tx.userGroupMembership.createMany({
              data: validUsers.map((u) => ({
                userId: u.id,
                groupId: id,
                source: GroupSource.IDP,
              })),
              skipDuplicates: true,
            });
            added += result.count;
          }
        }

        if (op.op === "remove" && memberValues.length > 0) {
          const result = await tx.userGroupMembership.deleteMany({
            where: { groupId: id, userId: { in: memberValues } },
          });
          removed += result.count;
        }

        if (op.op === "replace") {
          const current = await tx.userGroupMembership.findMany({
            where: { groupId: id, source: GroupSource.IDP },
            select: { userId: true },
          });
          const currentIds = new Set(current.map((m) => m.userId));
          const targetIds = new Set(memberValues);

          const toAdd = memberValues.filter((uid) => !currentIds.has(uid));
          const toRemove = [...currentIds].filter((uid) => !targetIds.has(uid));

          if (toAdd.length > 0) {
            const validUsers = await tx.user.findMany({
              where: { id: { in: toAdd } },
              select: { id: true },
            });
            if (validUsers.length > 0) {
              const result = await tx.userGroupMembership.createMany({
                data: validUsers.map((u) => ({
                  userId: u.id,
                  groupId: id,
                  source: GroupSource.IDP,
                })),
                skipDuplicates: true,
              });
              added += result.count;
            }
          }

          if (toRemove.length > 0) {
            const result = await tx.userGroupMembership.deleteMany({
              where: { groupId: id, userId: { in: toRemove } },
            });
            removed += result.count;
          }
        }
      }
    }

    if (added > 0 || removed > 0) {
      await tx.group.update({
        where: { id },
        data: { lastSyncedAt: new Date() },
      });
      await tx.idpSyncLog.create({
        data: {
          groupId: id,
          trigger: SyncTrigger.SCIM,
          status: SyncStatus.SUCCESS,
          added,
          removed,
          completedAt: new Date(),
        },
      });
    }
  });

  const group = await db.group.findUnique({
    where: { id },
    select: GROUP_SELECT,
  });
  return scimResponse(formatGroup(group!, req.nextUrl.origin));
};

/** グループ削除 */
export const DELETE = async (req: NextRequest, { params }: RouteContext) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { id } = await params;
  const existing = await db.group.findUnique({
    where: { id },
    select: { id: true, memberships: { select: { id: true } } },
  });
  if (!existing) return scimError(404, "Group not found");

  const memberCount = existing.memberships.length;

  await db.$transaction(async (tx) => {
    await tx.group.delete({ where: { id } });
    await tx.idpSyncLog.create({
      data: {
        trigger: SyncTrigger.SCIM,
        status: SyncStatus.SUCCESS,
        added: 0,
        removed: memberCount,
        completedAt: new Date(),
      },
    });
  });

  return new Response(null, { status: 204 });
};
