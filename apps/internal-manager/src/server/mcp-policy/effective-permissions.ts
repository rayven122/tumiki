import { createHash } from "node:crypto";
import {
  McpCatalogStatus,
  PolicyEffect,
  type PrismaTransactionClient,
} from "@tumiki/internal-db";
import { db } from "@tumiki/internal-db/server";

export type PermissionBits = {
  read: boolean;
  // v1はツール実行可否だけを管理するため、レスポンス値は常にfalseにする。
  write: false;
  execute: boolean;
};

export type DeniedReason =
  | "user_catalog_denied"
  | "user_tool_denied"
  | "group_catalog_denied"
  | "group_tool_denied"
  | "org_unit_catalog_denied"
  | "org_unit_tool_denied"
  | "not_granted"
  | "catalog_disabled";

export type EffectiveToolPermission = {
  allowed: boolean;
  deniedReason: DeniedReason | null;
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
    orgUnit: {
      id: string;
      parentId: string | null;
      path?: string;
      updatedAt: Date;
    };
  }[];
  groupMemberships: {
    group: { id: string };
  }[];
};

export type CatalogPolicyInput = {
  id: string;
  slug: string;
  status: McpCatalogStatus;
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
    reason: string | null;
    expiresAt: Date | null;
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
      reason: string | null;
      expiresAt: Date | null;
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

  if (memberships.every((membership) => membership.orgUnit.path)) {
    const ancestorPaths = new Set<string>();
    for (const membership of memberships) {
      const segments =
        membership.orgUnit.path?.split("/").filter(Boolean) ?? [];
      for (let index = 0; index < segments.length; index += 1) {
        ancestorPaths.add(`/${segments.slice(0, index + 1).join("/")}`);
      }
    }

    if (ancestorPaths.size > POLICY_CONTEXT_ORG_UNIT_LIMIT) {
      throw new Error(
        `OrgUnit ancestor count exceeded the policy context limit (${POLICY_CONTEXT_ORG_UNIT_LIMIT}); refusing incomplete MCP policy evaluation.`,
      );
    }

    return client.orgUnit.findMany({
      where: { path: { in: [...ancestorPaths] } },
      select: { id: true, parentId: true, updatedAt: true },
    });
  }

  const orgUnitsById = new Map(
    memberships.map((membership) => [
      membership.orgUnit.id,
      {
        id: membership.orgUnit.id,
        parentId: membership.orgUnit.parentId,
        updatedAt: membership.orgUnit.updatedAt,
      },
    ]),
  );
  const pendingParentIds = new Set(
    memberships
      .map((membership) => membership.orgUnit.parentId)
      .filter((parentId): parentId is string => parentId !== null),
  );

  while (pendingParentIds.size > 0) {
    const parentIds = [...pendingParentIds].filter(
      (parentId) => !orgUnitsById.has(parentId),
    );
    pendingParentIds.clear();
    if (parentIds.length === 0) break;

    if (orgUnitsById.size + parentIds.length > POLICY_CONTEXT_ORG_UNIT_LIMIT) {
      throw new Error(
        `OrgUnit ancestor count exceeded the policy context limit (${POLICY_CONTEXT_ORG_UNIT_LIMIT}); refusing incomplete MCP policy evaluation.`,
      );
    }

    const parents = await client.orgUnit.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, parentId: true, updatedAt: true },
    });
    for (const parent of parents) {
      if (orgUnitsById.has(parent.id)) continue;
      orgUnitsById.set(parent.id, parent);
      if (orgUnitsById.size > POLICY_CONTEXT_ORG_UNIT_LIMIT) {
        throw new Error(
          `OrgUnit ancestor count exceeded the policy context limit (${POLICY_CONTEXT_ORG_UNIT_LIMIT}); refusing incomplete MCP policy evaluation.`,
        );
      }
      if (parent.parentId && !orgUnitsById.has(parent.parentId)) {
        pendingParentIds.add(parent.parentId);
      }
    }
  }

  return [...orgUnitsById.values()];
};

export const evaluateCatalogPermissions = (
  user: PolicyUser,
  catalog: CatalogPolicyInput,
  allOrgUnits: { id: string; parentId: string | null }[],
): EffectiveCatalogPermissions => {
  if (catalog.status !== McpCatalogStatus.ACTIVE) {
    return {
      permissions: {
        read: false,
        write: false,
        execute: false,
      },
      tools: new Map(
        catalog.tools.map((tool) => [
          tool.id,
          {
            allowed: false,
            deniedReason: "catalog_disabled",
          },
        ]),
      ),
    };
  }

  const orgUnitIds = collectPolicyOrgUnitIds(
    user.orgUnitMemberships,
    allOrgUnits,
  );
  const groupIds = new Set(
    user.groupMemberships.map((membership) => membership.group.id),
  );
  const now = new Date();
  const isActiveUserPermission = (permission: {
    userId: string;
    expiresAt: Date | null;
  }) =>
    permission.userId === user.id &&
    (permission.expiresAt === null || permission.expiresAt > now);

  // DB側でも対象ユーザー・所属グループ・所属部署に絞るが、呼び出し元が増えても安全側になるよう評価時にも再確認する。
  const catalogUserEffects = catalog.userCatalogPermissions
    .filter(isActiveUserPermission)
    .map((permission) => permission.effect);
  const catalogGroupEffects = catalog.groupCatalogPermissions
    .filter((permission) => groupIds.has(permission.groupId))
    .map((permission) => permission.effect);
  const catalogOrgUnitEffects = catalog.orgUnitCatalogPermissions
    .filter((permission) => orgUnitIds.has(permission.orgUnitId))
    .map((permission) => permission.effect);

  const tools = catalog.tools.map((tool) => {
    // 優先順: DENY(user_catalog > user_tool > group_catalog > group_tool > orgUnit_catalog > orgUnit_tool)
    // > ALLOW(user catalog/tool > group catalog/tool > orgUnit catalog/tool) > defaultAllowed。
    // ユーザー個別ALLOWは未設定状態への例外であり、部署/グループDENYを上書きしない。
    // カタログ単位の権限は、そのカタログ内の全ツールに適用する。
    // ツール単位の権限はカタログ単位の権限と合算し、下の優先順で最終判定する。
    const toolUserEffects = tool.userPermissions
      .filter(isActiveUserPermission)
      .map((permission) => permission.effect);
    const toolGroupEffects = tool.groupPermissions
      .filter((permission) => groupIds.has(permission.groupId))
      .map((permission) => permission.effect);
    const toolOrgUnitEffects = tool.orgUnitPermissions
      .filter((permission) => orgUnitIds.has(permission.orgUnitId))
      .map((permission) => permission.effect);

    // 明示DENYは安全側のガードレールとして扱うため、sourceに関わらずALLOWより優先する。
    if (catalogUserEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "user_catalog_denied",
        },
      ] as const;
    }
    if (toolUserEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "user_tool_denied",
        },
      ] as const;
    }
    if (catalogGroupEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "group_catalog_denied",
        },
      ] as const;
    }
    if (toolGroupEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "group_tool_denied",
        },
      ] as const;
    }
    if (catalogOrgUnitEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "org_unit_catalog_denied",
        },
      ] as const;
    }
    if (toolOrgUnitEffects.includes(PolicyEffect.DENY)) {
      return [
        tool.id,
        {
          allowed: false,
          deniedReason: "org_unit_tool_denied",
        },
      ] as const;
    }
    if (
      catalogUserEffects.includes(PolicyEffect.ALLOW) ||
      toolUserEffects.includes(PolicyEffect.ALLOW)
    ) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }
    if (
      catalogGroupEffects.includes(PolicyEffect.ALLOW) ||
      toolGroupEffects.includes(PolicyEffect.ALLOW)
    ) {
      return [tool.id, { allowed: true, deniedReason: null }] as const;
    }
    if (
      catalogOrgUnitEffects.includes(PolicyEffect.ALLOW) ||
      toolOrgUnitEffects.includes(PolicyEffect.ALLOW)
    ) {
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
      // ツール未登録のカタログは実行対象がないため、カタログ単位ALLOWがあってもDesktopでは利用不可にする。
      read: anyAllowed,
      // v1 はツール実行可否のみを扱うため、書き込み権限は常に無効にする。
      write: false,
      execute: anyAllowed,
    },
    tools: new Map<string, EffectiveToolPermission>(tools),
  };
};

// policyVersionはDesktop向けレスポンスのキャッシュキーなので、routeごとの安定JSONだけを受け取る。
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
            select: { id: true, parentId: true, path: true, updatedAt: true },
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
