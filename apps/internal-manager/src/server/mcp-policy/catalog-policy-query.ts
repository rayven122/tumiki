type BuildCatalogPolicySelectInput = {
  userId: string;
  groupPermissionIds: string[];
  orgUnitPermissionIds: string[];
  now: Date;
  toolTake?: number;
};

export const buildCatalogPolicySelect = ({
  userId,
  groupPermissionIds,
  orgUnitPermissionIds,
  now,
  toolTake,
}: BuildCatalogPolicySelectInput) => ({
  id: true,
  slug: true,
  status: true,
  updatedAt: true,
  orgUnitCatalogPermissions: {
    where: { orgUnitId: { in: orgUnitPermissionIds } },
    select: { orgUnitId: true, effect: true, updatedAt: true },
    orderBy: [{ orgUnitId: "asc" as const }],
  },
  groupCatalogPermissions: {
    where: { groupId: { in: groupPermissionIds } },
    select: { groupId: true, effect: true, updatedAt: true },
    orderBy: [{ groupId: "asc" as const }],
  },
  userCatalogPermissions: {
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      userId: true,
      effect: true,
      reason: true,
      expiresAt: true,
      updatedAt: true,
    },
    orderBy: [{ userId: "asc" as const }],
  },
  tools: {
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      defaultAllowed: true,
      updatedAt: true,
      orgUnitPermissions: {
        where: { orgUnitId: { in: orgUnitPermissionIds } },
        select: { orgUnitId: true, effect: true, updatedAt: true },
        orderBy: [{ orgUnitId: "asc" as const }],
      },
      groupPermissions: {
        where: { groupId: { in: groupPermissionIds } },
        select: { groupId: true, effect: true, updatedAt: true },
        orderBy: [{ groupId: "asc" as const }],
      },
      userPermissions: {
        where: {
          userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          userId: true,
          effect: true,
          reason: true,
          expiresAt: true,
          updatedAt: true,
        },
        orderBy: [{ userId: "asc" as const }],
      },
    },
    orderBy: { name: "asc" as const },
    ...(toolTake === undefined ? {} : { take: toolTake }),
  },
});
