import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";
import { GroupSource, SyncStatus, SyncTrigger } from "@tumiki/internal-db";
import { validateScimAuth, SCIM_PROVIDER } from "~/lib/scim/auth";
import {
  formatGroup,
  listResponse,
  scimError,
  scimResponse,
} from "~/lib/scim/formatters";
import { scimGroupSchema } from "~/lib/scim/schemas";

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

/** グループ一覧 */
export const GET = async (req: NextRequest) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const { searchParams } = req.nextUrl;
  const startIndex = Math.max(1, Number(searchParams.get("startIndex") ?? 1));
  const count = Math.min(
    100,
    Math.max(1, Number(searchParams.get("count") ?? 100)),
  );

  const where = { source: GroupSource.IDP, provider: SCIM_PROVIDER };

  const [groups, total] = await Promise.all([
    db.group.findMany({
      where,
      select: GROUP_SELECT,
      skip: startIndex - 1,
      take: count,
      orderBy: { createdAt: "asc" },
    }),
    db.group.count({ where }),
  ]);

  const origin = req.nextUrl.origin;
  const resources = groups.map((g) => formatGroup(g, origin));

  return scimResponse(listResponse(resources, total, startIndex));
};

/** グループ作成 */
export const POST = async (req: NextRequest) => {
  if (!(await validateScimAuth(req))) return scimError(401, "Unauthorized");

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = scimGroupSchema.safeParse(rawBody);
  if (!parsed.success) {
    return scimError(400, parsed.error.message, "invalidValue");
  }

  const input = parsed.data;

  // externalId重複チェック
  if (input.externalId) {
    const existing = await db.group.findUnique({
      where: {
        provider_externalId: {
          provider: SCIM_PROVIDER,
          externalId: input.externalId,
        },
      },
    });
    if (existing) {
      return scimError(
        409,
        `Group with externalId ${input.externalId} already exists`,
        "uniqueness",
      );
    }
  }

  // メンバーのユーザーIDが実在するか確認
  const memberIds = input.members.map((m) => m.value);
  const validUsers =
    memberIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: memberIds } },
          select: { id: true },
        })
      : [];

  const validUserIds = new Set(validUsers.map((u) => u.id));
  const added = validUserIds.size;

  const group = await db.$transaction(async (tx) => {
    const created = await tx.group.create({
      data: {
        name: input.displayName,
        source: GroupSource.IDP,
        provider: SCIM_PROVIDER,
        externalId: input.externalId ?? null,
        lastSyncedAt: new Date(),
        ...(added > 0
          ? {
              memberships: {
                createMany: {
                  data: [...validUserIds].map((userId) => ({
                    userId,
                    source: GroupSource.IDP,
                  })),
                  skipDuplicates: true,
                },
              },
            }
          : {}),
      },
      select: GROUP_SELECT,
    });

    await tx.idpSyncLog.create({
      data: {
        groupId: created.id,
        trigger: SyncTrigger.SCIM,
        status: SyncStatus.SUCCESS,
        added,
        removed: 0,
        completedAt: new Date(),
      },
    });

    return created;
  });

  return scimResponse(formatGroup(group, req.nextUrl.origin), 201);
};
