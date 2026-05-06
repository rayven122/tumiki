import { createHash } from "node:crypto";
import {
  PolicyEffect,
  type PrismaTransactionClient,
} from "@tumiki/internal-db";
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

export type EffectiveCatalogPermissions = {
  permissions: PermissionBits;
  tools: Map<string, EffectiveToolPermission>;
};

export type PolicyUser = {
  id: string;
  isActive: boolean;
  updatedAt: Date;
  orgUnitMemberships: {
    updatedAt: Date;
    orgUnit: { id: string; parentId: string | null; updatedAt: Date };
  }[];
  groupMemberships: {
    group: { id: string };
  }[];
};

export type CatalogPolicyInput = {
  id: string;
  slug: string;
  updatedAt: Date;
  orgUnitCatalogPermissions: {
    orgUnitId: string;
    effect: PolicyEffect;
    updatedAt: Date;
  }[];
  groupCatalogPermissions: {
    groupId: string;
    effect: PolicyEffect;
    updatedAt: Date;
  }[];
  userCatalogPermissions: {
    userId: string;
    effect: PolicyEffect;
    updatedAt: Date;
  }[];
  tools: {
    id: string;
    name: string;
    defaultAllowed: boolean;
    updatedAt: Date;
    orgUnitPermissions: {
      orgUnitId: string;
      effect: PolicyEffect;
      updatedAt: Date;
    }[];
    groupPermissions: {
      groupId: string;
      effect: PolicyEffect;
      updatedAt: Date;
    }[];
    userPermissions: {
      userId: string;
      effect: PolicyEffect;
      updatedAt: Date;
    }[];
  }[];
};

export const POLICY_CONTEXT_ORG_UNIT_LIMIT = 2000;

export const collectPolicyOrgUnitIds = (
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

export const getPolicyOrgUnitsForMemberships = async (
  memberships: PolicyUser["orgUnitMemberships"],
  client: PrismaTransactionClient = db,
) => {
  if (memberships.length === 0) return [];

  const orgUnits = await client.orgUnit.findMany({
    select: { id: true, parentId: true, updatedAt: true },
    orderBy: { id: "asc" },
    take: POLICY_CONTEXT_ORG_UNIT_LIMIT + 1,
  });
  if (orgUnits.length > POLICY_CONTEXT_ORG_UNIT_LIMIT) {
    throw new Error(
      `OrgUnit count exceeded the policy context limit (${POLICY_CONTEXT_ORG_UNIT_LIMIT}); refusing incomplete MCP policy evaluation.`,
    );
  }

  const orgUnitIds = collectPolicyOrgUnitIds(memberships, orgUnits);
  return orgUnits.filter((unit) => orgUnitIds.has(unit.id));
};

export const evaluateCatalogPermissions = (
  user: PolicyUser,
  catalog: CatalogPolicyInput,
  allOrgUnits: { id: string; parentId: string | null }[],
): EffectiveCatalogPermissions => {
  const orgUnitIds = collectPolicyOrgUnitIds(
    user.orgUnitMemberships,
    allOrgUnits,
  );
  const groupIds = new Set(
    user.groupMemberships.map((membership) => membership.group.id),
  );

  const catalogUserEffects = catalog.userCatalogPermissions
    .filter((permission) => permission.userId === user.id)
    .map((permission) => permission.effect);
  const catalogGroupEffects = catalog.groupCatalogPermissions
    .filter((permission) => groupIds.has(permission.groupId))
    .map((permission) => permission.effect);
  const catalogOrgUnitEffects = catalog.orgUnitCatalogPermissions
    .filter((permission) => orgUnitIds.has(permission.orgUnitId))
    .map((permission) => permission.effect);

  const tools = catalog.tools.map((tool) => {
    // カタログ単位の権限は、そのカタログ内の全ツールに適用する。
    // ツール単位の権限はカタログ単位の権限と合算し、下の優先順で最終判定する。
    const userEffects = [
      ...catalogUserEffects,
      ...tool.userPermissions
        .filter((permission) => permission.userId === user.id)
        .map((permission) => permission.effect),
    ];
    const groupEffects = [
      ...catalogGroupEffects,
      ...tool.groupPermissions
        .filter((permission) => groupIds.has(permission.groupId))
        .map((permission) => permission.effect),
    ];
    const orgUnitEffects = [
      ...catalogOrgUnitEffects,
      ...tool.orgUnitPermissions
        .filter((permission) => orgUnitIds.has(permission.orgUnitId))
        .map((permission) => permission.effect),
    ];

    // 明示DENYは安全側のガードレールとして扱うため、sourceに関わらずALLOWより優先する。
    // ユーザー個別ALLOWは未設定状態への例外であり、部署/グループDENYの解除には使わない。
    if (userEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "user_denied",
        },
      ] as const;
    }
    if (groupEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "group_denied",
        },
      ] as const;
    }
    if (orgUnitEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "org_unit_denied",
        },
      ] as const;
    }
    if (userEffects.includes(PolicyEffect.ALLOW)) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }
    if (groupEffects.includes(PolicyEffect.ALLOW)) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }
    if (orgUnitEffects.includes(PolicyEffect.ALLOW)) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }
    if (tool.defaultAllowed) {
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

  const anyAllowed = tools.some(([, permission]) => permission.allowed);

  return {
    permissions: {
      // v1 はカタログ閲覧とツール実行を同じ許可状態として扱う。
      read: anyAllowed,
      // v1 はツール実行可否のみを扱うため、書き込み権限は常に無効にする。
      write: false,
      execute: anyAllowed,
    },
    tools: new Map<string, EffectiveToolPermission>(tools),
  };
};

export const buildPolicyVersion = (policyState: unknown): string =>
  `pol_v1_${createHash("sha256")
    .update(JSON.stringify(policyState))
    .digest("base64url")
    .slice(0, 32)}`;

export const getPolicyContextForUser = async (
  userId: string,
  client: PrismaTransactionClient = db,
) => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
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
            select: { id: true },
          },
        },
      },
    },
  });

  if (!user) return { user, orgUnits: [] };

  const orgUnits = await getPolicyOrgUnitsForMemberships(
    user.orgUnitMemberships,
    client,
  );

  return { user, orgUnits };
};
