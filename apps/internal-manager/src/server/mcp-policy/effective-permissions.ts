import { createHash } from "node:crypto";
import { PolicyEffect } from "@tumiki/internal-db";
import { db } from "@tumiki/internal-db/server";

export type PermissionBits = {
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type EffectiveToolPermission = {
  allowed: boolean;
  deniedReason: string | null;
};

export type PolicyUser = {
  id: string;
  updatedAt: Date;
  orgUnitMemberships: {
    updatedAt: Date;
    orgUnit: { id: string; parentId: string | null; updatedAt: Date };
  }[];
  groupMemberships: {
    group: {
      permissions: {
        mcpServerId: string;
        read: boolean;
        write: boolean;
        execute: boolean;
      }[];
    };
  }[];
  individualPermissions: {
    mcpServerId: string;
    updatedAt: Date;
  }[];
};

export type CatalogPolicyInput = {
  id: string;
  slug: string;
  updatedAt: Date;
  tools: {
    id: string;
    name: string;
    updatedAt: Date;
    orgUnitPermissions: {
      orgUnitId: string;
      effect: PolicyEffect;
      updatedAt: Date;
    }[];
  }[];
};

const emptyBits = (): PermissionBits => ({
  read: false,
  write: false,
  execute: false,
});

const hasAnyPermission = (permissions: PermissionBits) =>
  permissions.read || permissions.write || permissions.execute;

const collectOrgUnitIds = (
  memberships: PolicyUser["orgUnitMemberships"],
  allOrgUnits: { id: string; parentId: string | null }[],
) => {
  const byId = new Map(allOrgUnits.map((unit) => [unit.id, unit]));
  const ids = new Set<string>();

  for (const membership of memberships) {
    let cursor: string | null = membership.orgUnit.id;
    while (cursor) {
      if (ids.has(cursor)) break;
      ids.add(cursor);
      cursor = byId.get(cursor)?.parentId ?? null;
    }
  }

  return ids;
};

const hasIndividualAllow = (user: PolicyUser, catalog: CatalogPolicyInput) =>
  user.individualPermissions.some(
    (permission) =>
      permission.mcpServerId === catalog.id ||
      permission.mcpServerId === catalog.slug,
  );

const getFallbackGroupBits = (
  user: PolicyUser,
  catalog: CatalogPolicyInput,
): PermissionBits => {
  const permissions = emptyBits();
  for (const membership of user.groupMemberships) {
    for (const permission of membership.group.permissions) {
      if (
        permission.mcpServerId !== catalog.id &&
        permission.mcpServerId !== catalog.slug
      ) {
        continue;
      }
      permissions.read ||= permission.read;
      permissions.write ||= permission.write;
      permissions.execute ||= permission.execute;
    }
  }
  return permissions;
};

export const evaluateCatalogPermissions = (
  user: PolicyUser,
  catalog: CatalogPolicyInput,
  allOrgUnits: { id: string; parentId: string | null }[],
) => {
  const orgUnitIds = collectOrgUnitIds(user.orgUnitMemberships, allOrgUnits);
  const individualAllow = hasIndividualAllow(user, catalog);
  const fallbackGroupBits = getFallbackGroupBits(user, catalog);
  const fallbackGroupAllowed = hasAnyPermission(fallbackGroupBits);

  const tools = catalog.tools.map((tool) => {
    if (individualAllow) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }

    const relevant = tool.orgUnitPermissions.filter((permission) =>
      orgUnitIds.has(permission.orgUnitId),
    );
    if (
      relevant.some((permission) => permission.effect === PolicyEffect.DENY)
    ) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "org_unit_denied",
        },
      ] as const;
    }
    if (
      relevant.some((permission) => permission.effect === PolicyEffect.ALLOW) ||
      fallbackGroupAllowed
    ) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }

    return [
      tool.id,
      {
        allowed: false,
        deniedReason: "not_granted",
      },
    ] as const;
  });

  return {
    permissions: {
      read: tools.some(([, permission]) => permission.allowed),
      write: false,
      execute: tools.some(([, permission]) => permission.allowed),
    },
    tools: new Map<string, EffectiveToolPermission>(tools),
  };
};

export const buildPolicyVersion = (policyState: unknown): string =>
  `pol_v1_${createHash("sha256")
    .update(JSON.stringify(policyState))
    .digest("base64url")
    .slice(0, 32)}`;

export const getPolicyContextForUser = async (userId: string) => {
  const now = new Date();
  const [user, orgUnits] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        updatedAt: true,
        orgUnitMemberships: {
          select: {
            updatedAt: true,
            orgUnit: {
              select: { id: true, parentId: true, updatedAt: true },
            },
          },
        },
        groupMemberships: {
          select: {
            group: {
              select: {
                permissions: {
                  select: {
                    mcpServerId: true,
                    read: true,
                    write: true,
                    execute: true,
                  },
                },
              },
            },
          },
        },
        individualPermissions: {
          where: {
            status: "APPROVED",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            mcpServerId: true,
            updatedAt: true,
          },
        },
      },
    }),
    db.orgUnit.findMany({
      select: { id: true, parentId: true, updatedAt: true },
    }),
  ]);

  return { user, orgUnits };
};
