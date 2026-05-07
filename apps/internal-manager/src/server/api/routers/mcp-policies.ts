import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { McpCatalogStatus, PolicyEffect } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  evaluateCatalogPermissions,
  getPolicyContextForUser,
  type CatalogPolicyInput,
  type DeniedReason,
  type PolicyUser,
} from "~/server/mcp-policy/effective-permissions";
import {
  NO_GROUP_PERMISSION_ID,
  NO_ORG_UNIT_PERMISSION_ID,
  NO_USER_PERMISSION_ID,
} from "~/server/mcp-policy/constants";
import { buildCatalogPolicySelect } from "~/server/mcp-policy/catalog-policy-query";
import {
  POLICY_TOOL_LIMIT,
  POLICY_TOOL_TAKE,
} from "~/server/mcp-policy/limits";

const POLICY_MATRIX_ORG_UNIT_LIMIT = 1000;
const POLICY_MATRIX_CATALOG_LIMIT = 200;

const targetPermissionSummaryInput = z.object({
  targetType: z.enum(["user", "org", "group"]),
  targetId: z.string().min(1),
});

type SummaryEffect = "ALLOW" | "DENY" | "UNSET";
type SummarySourceKind =
  | "user"
  | "group"
  | "org"
  | "default"
  | "catalog"
  | "none";

type SummaryCatalog = Omit<CatalogPolicyInput, "tools"> & {
  name: string;
  tools: (CatalogPolicyInput["tools"][number] & {
    riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  })[];
};

type PermissionSettingRow = {
  id: string;
  catalogId: string;
  catalogName: string;
  toolId: string | null;
  toolName: string | null;
  effect: PolicyEffect;
  sourceKind: SummarySourceKind;
  reason: string | null;
};

type PermissionWithOptionalReason = {
  effect: PolicyEffect;
  reason?: string | null;
};

const ensureWithinLimit = <T>(rows: T[], limit: number, label: string): T[] => {
  if (rows.length <= limit) return rows;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `${label}が上限(${limit})を超えました。フィルタを使用してください。`,
  });
};

const toPermissionIds = (ids: string[], fallback: string) =>
  ids.length > 0 ? ids : [fallback];

const deniedReasonLabel: Record<DeniedReason, string> = {
  user_catalog_denied: "ユーザー個別設定による拒否",
  user_tool_denied: "ユーザー個別設定による拒否",
  group_catalog_denied: "所属グループの拒否が優先",
  group_tool_denied: "所属グループの拒否が優先",
  org_unit_catalog_denied: "所属組織の拒否が優先",
  org_unit_tool_denied: "所属組織の拒否が優先",
  not_granted: "明示的な許可がありません",
  catalog_disabled: "カタログが無効です",
};

const buildAppliedSettings = (
  catalogs: SummaryCatalog[],
  targetType: "user" | "org" | "group",
) => {
  const rows: PermissionSettingRow[] = [];

  const sourceKinds =
    targetType === "user" ? (["org", "group", "user"] as const) : [targetType];

  const pushPermission = ({
    catalog,
    tool,
    permission,
    sourceKind,
  }: {
    catalog: SummaryCatalog;
    tool?: SummaryCatalog["tools"][number];
    permission: PermissionWithOptionalReason;
    sourceKind: Extract<SummarySourceKind, "user" | "org" | "group">;
  }) => {
    rows.push({
      id: `${catalog.id}:${tool?.id ?? "catalog"}:${sourceKind}:${rows.length}`,
      catalogId: catalog.id,
      catalogName: catalog.name,
      toolId: tool?.id ?? null,
      toolName: tool?.name ?? null,
      effect: permission.effect,
      sourceKind,
      reason: permission.reason ?? null,
    });
  };

  for (const catalog of catalogs) {
    for (const sourceKind of sourceKinds) {
      const catalogPermissions =
        sourceKind === "user"
          ? catalog.userCatalogPermissions
          : sourceKind === "group"
            ? catalog.groupCatalogPermissions
            : catalog.orgUnitCatalogPermissions;
      for (const permission of catalogPermissions) {
        pushPermission({ catalog, permission, sourceKind });
      }
    }

    for (const tool of catalog.tools) {
      for (const sourceKind of sourceKinds) {
        const toolPermissions =
          sourceKind === "user"
            ? tool.userPermissions
            : sourceKind === "group"
              ? tool.groupPermissions
              : tool.orgUnitPermissions;
        for (const permission of toolPermissions) {
          pushPermission({ catalog, tool, permission, sourceKind });
        }
      }
    }
  }

  return rows;
};

const firstEffect = (
  rows: { effect: PolicyEffect }[],
  effect: PolicyEffect,
): boolean => rows.some((row) => row.effect === effect);

const resolveDirectToolPermission = ({
  catalog,
  tool,
  targetType,
}: {
  catalog: SummaryCatalog;
  tool: SummaryCatalog["tools"][number];
  targetType: "org" | "group";
}): {
  effect: SummaryEffect;
  reason: string;
  sourceKind: SummarySourceKind;
} => {
  if (catalog.status !== McpCatalogStatus.ACTIVE) {
    return {
      effect: "DENY",
      reason: "カタログが無効です",
      sourceKind: "catalog",
    };
  }

  const catalogRows =
    targetType === "group"
      ? catalog.groupCatalogPermissions
      : catalog.orgUnitCatalogPermissions;
  const toolRows =
    targetType === "group" ? tool.groupPermissions : tool.orgUnitPermissions;
  const sourceKind = targetType;

  if (firstEffect(catalogRows, PolicyEffect.DENY)) {
    return {
      effect: "DENY",
      reason:
        targetType === "group"
          ? "グループのカタログ拒否が優先"
          : "組織のカタログ拒否が優先",
      sourceKind,
    };
  }
  if (firstEffect(toolRows, PolicyEffect.DENY)) {
    return {
      effect: "DENY",
      reason:
        targetType === "group"
          ? "グループのツール拒否が優先"
          : "組織のツール拒否が優先",
      sourceKind,
    };
  }
  if (firstEffect(catalogRows, PolicyEffect.ALLOW)) {
    return {
      effect: "ALLOW",
      reason:
        targetType === "group"
          ? "グループのカタログ許可"
          : "組織のカタログ許可",
      sourceKind,
    };
  }
  if (firstEffect(toolRows, PolicyEffect.ALLOW)) {
    return {
      effect: "ALLOW",
      reason:
        targetType === "group" ? "グループのツール許可" : "組織のツール許可",
      sourceKind,
    };
  }
  if (tool.defaultAllowed) {
    return {
      effect: "ALLOW",
      reason: "ツールの既定許可",
      sourceKind: "default",
    };
  }
  return {
    effect: "UNSET",
    reason: "未設定",
    sourceKind: "none",
  };
};

const inferAllowedSource = (
  catalog: SummaryCatalog,
  tool: SummaryCatalog["tools"][number],
): SummarySourceKind => {
  if (
    firstEffect(catalog.userCatalogPermissions, PolicyEffect.ALLOW) ||
    firstEffect(tool.userPermissions, PolicyEffect.ALLOW)
  ) {
    return "user";
  }
  if (
    firstEffect(catalog.groupCatalogPermissions, PolicyEffect.ALLOW) ||
    firstEffect(tool.groupPermissions, PolicyEffect.ALLOW)
  ) {
    return "group";
  }
  if (
    firstEffect(catalog.orgUnitCatalogPermissions, PolicyEffect.ALLOW) ||
    firstEffect(tool.orgUnitPermissions, PolicyEffect.ALLOW)
  ) {
    return "org";
  }
  if (tool.defaultAllowed) return "default";
  return "none";
};

const buildSummaryResponse = ({
  catalogs,
  targetType,
  user,
  orgUnits,
}: {
  catalogs: SummaryCatalog[];
  targetType: "user" | "org" | "group";
  user?: PolicyUser;
  orgUnits?: { id: string; parentId: string | null }[];
}) => {
  const settings = buildAppliedSettings(catalogs, targetType);
  const finalRows = catalogs.flatMap((catalog) => {
    const effective =
      targetType === "user" && user
        ? evaluateCatalogPermissions(user, catalog, orgUnits ?? [])
        : null;

    return catalog.tools.map((tool) => {
      const direct =
        targetType === "user"
          ? null
          : resolveDirectToolPermission({ catalog, tool, targetType });
      const userPermission =
        targetType === "user"
          ? (effective?.tools.get(tool.id) ?? {
              allowed: false,
              deniedReason: "not_granted" as const,
            })
          : null;
      const effect: SummaryEffect =
        targetType === "user"
          ? userPermission?.allowed
            ? "ALLOW"
            : "DENY"
          : (direct?.effect ?? "UNSET");
      const reason =
        targetType === "user"
          ? userPermission?.allowed
            ? "最終評価で許可"
            : deniedReasonLabel[userPermission?.deniedReason ?? "not_granted"]
          : (direct?.reason ?? "未設定");
      const sourceKind =
        targetType === "user"
          ? userPermission?.allowed
            ? inferAllowedSource(catalog, tool)
            : userPermission?.deniedReason?.startsWith("user_")
              ? "user"
              : userPermission?.deniedReason?.startsWith("group_")
                ? "group"
                : userPermission?.deniedReason?.startsWith("org_unit_")
                  ? "org"
                  : userPermission?.deniedReason === "catalog_disabled"
                    ? "catalog"
                    : "none"
          : (direct?.sourceKind ?? "none");

      return {
        id: `${catalog.id}:${tool.id}`,
        catalogId: catalog.id,
        catalogName: catalog.name,
        toolId: tool.id,
        toolName: tool.name,
        riskLevel: tool.riskLevel ?? "MEDIUM",
        effect,
        reason,
        sourceKind,
      };
    });
  });

  return {
    summary: {
      settingsCount: settings.length,
      userOverrideCount: settings.filter((row) => row.sourceKind === "user")
        .length,
      allowCount: finalRows.filter((row) => row.effect === "ALLOW").length,
      denyCount: finalRows.filter((row) => row.effect === "DENY").length,
      unsetCount: finalRows.filter((row) => row.effect === "UNSET").length,
    },
    settings,
    finalRows,
  };
};

export const mcpPoliciesRouter = createTRPCRouter({
  getMatrix: adminProcedure
    .input(
      z
        .object({
          orgUnitId: z.string().min(1).nullable().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const selectedOrgUnitId = input?.orgUnitId ?? null;
      const [orgUnits, catalogs] = await Promise.all([
        ctx.db.orgUnit.findMany({
          // OrgUnit.path はDBでindex済み。全件返却は部署セレクタ用で、上限超過時はエラーにする。
          orderBy: [{ path: "asc" }, { name: "asc" }],
          take: POLICY_MATRIX_ORG_UNIT_LIMIT + 1,
        }),
        ctx.db.mcpCatalog.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            updatedAt: true,
            orgUnitCatalogPermissions: {
              // orgUnit未選択時は存在しないIDで絞り込み、全権限データのロードを避ける。
              where: {
                orgUnitId: selectedOrgUnitId ?? NO_ORG_UNIT_PERMISSION_ID,
              },
              select: {
                orgUnitId: true,
                catalogId: true,
                effect: true,
              },
            },
            tools: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                defaultAllowed: true,
                updatedAt: true,
                orgUnitPermissions: {
                  // orgUnit未選択時は存在しないIDで絞り込み、全権限データのロードを避ける。
                  where: {
                    orgUnitId: selectedOrgUnitId ?? NO_ORG_UNIT_PERMISSION_ID,
                  },
                  select: {
                    orgUnitId: true,
                    toolId: true,
                    effect: true,
                  },
                },
              },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
          take: POLICY_MATRIX_CATALOG_LIMIT + 1,
        }),
      ]);

      return {
        orgUnits: ensureWithinLimit(
          orgUnits,
          POLICY_MATRIX_ORG_UNIT_LIMIT,
          "部署数",
        ),
        catalogs: ensureWithinLimit(
          catalogs,
          POLICY_MATRIX_CATALOG_LIMIT,
          "カタログ数",
        ),
      };
    }),

  updateCatalogPermission: adminProcedure
    .input(
      z.object({
        orgUnitId: z.string().min(1),
        catalogId: z.string().min(1),
        effect: z.nativeEnum(PolicyEffect).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const [catalog, orgUnit] = await Promise.all([
          tx.mcpCatalog.findFirst({
            where: { id: input.catalogId, deletedAt: null },
            select: { id: true },
          }),
          tx.orgUnit.findUnique({
            where: { id: input.orgUnitId },
            select: { id: true },
          }),
        ]);
        if (!orgUnit) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "部署が見つかりません",
          });
        }
        if (!catalog) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "カタログが見つかりません",
          });
        }

        if (input.effect === null) {
          await tx.orgUnitCatalogPermission.deleteMany({
            where: {
              orgUnitId: input.orgUnitId,
              catalogId: input.catalogId,
            },
          });
          return { ok: true };
        }
        const effect = input.effect;

        await tx.orgUnitCatalogPermission.upsert({
          where: {
            orgUnitId_catalogId: {
              orgUnitId: input.orgUnitId,
              catalogId: input.catalogId,
            },
          },
          create: {
            orgUnitId: input.orgUnitId,
            catalogId: input.catalogId,
            effect,
          },
          update: {
            effect,
          },
        });
        return { ok: true };
      });
    }),

  updateToolPermission: adminProcedure
    .input(
      z.object({
        orgUnitId: z.string().min(1),
        catalogId: z.string().min(1),
        toolId: z.string().min(1),
        effect: z.nativeEnum(PolicyEffect).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const [tool, orgUnit] = await Promise.all([
          tx.mcpCatalogTool.findFirst({
            where: {
              id: input.toolId,
              deletedAt: null,
              catalog: { deletedAt: null },
            },
            select: { catalogId: true },
          }),
          tx.orgUnit.findUnique({
            where: { id: input.orgUnitId },
            select: { id: true },
          }),
        ]);
        if (!orgUnit) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "部署が見つかりません",
          });
        }
        if (!tool) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ツールが見つかりません",
          });
        }
        if (tool.catalogId !== input.catalogId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "ツールが指定カタログに属していません",
          });
        }

        if (input.effect === null) {
          await tx.orgUnitToolPermission.deleteMany({
            where: {
              orgUnitId: input.orgUnitId,
              toolId: input.toolId,
            },
          });
          return { ok: true };
        }
        const effect = input.effect;

        await tx.orgUnitToolPermission.upsert({
          where: {
            orgUnitId_toolId: {
              orgUnitId: input.orgUnitId,
              toolId: input.toolId,
            },
          },
          create: {
            orgUnitId: input.orgUnitId,
            catalogId: tool.catalogId,
            toolId: input.toolId,
            effect,
          },
          update: {
            effect,
          },
        });
        return { ok: true };
      });
    }),

  getTargetPermissionSummary: adminProcedure
    .input(targetPermissionSummaryInput)
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const targetType = input.targetType;

      let user: PolicyUser | undefined;
      let orgUnits: { id: string; parentId: string | null }[] = [];
      let permissionIds = {
        userId: NO_USER_PERMISSION_ID,
        groupPermissionIds: [NO_GROUP_PERMISSION_ID],
        orgUnitPermissionIds: [NO_ORG_UNIT_PERMISSION_ID],
      };

      if (targetType === "user") {
        const context = await getPolicyContextForUser(input.targetId, ctx.db);
        if (!context.user) return null;

        user = context.user;
        orgUnits = context.orgUnits;
        const groupIds = context.user.groupMemberships.map(
          (membership) => membership.group.id,
        );
        const orgUnitIds = context.orgUnits.map((orgUnit) => orgUnit.id);
        permissionIds = {
          userId: input.targetId,
          groupPermissionIds: toPermissionIds(groupIds, NO_GROUP_PERMISSION_ID),
          orgUnitPermissionIds: toPermissionIds(
            orgUnitIds,
            NO_ORG_UNIT_PERMISSION_ID,
          ),
        };
      } else if (targetType === "org") {
        const orgUnit = await ctx.db.orgUnit.findUnique({
          where: { id: input.targetId },
          select: { id: true },
        });
        if (!orgUnit) return null;
        permissionIds = {
          userId: NO_USER_PERMISSION_ID,
          groupPermissionIds: [NO_GROUP_PERMISSION_ID],
          orgUnitPermissionIds: [input.targetId],
        };
      } else {
        const group = await ctx.db.group.findUnique({
          where: { id: input.targetId },
          select: { id: true },
        });
        if (!group) return null;
        permissionIds = {
          userId: NO_USER_PERMISSION_ID,
          groupPermissionIds: [input.targetId],
          orgUnitPermissionIds: [NO_ORG_UNIT_PERMISSION_ID],
        };
      }

      const policySelect = buildCatalogPolicySelect({
        userId: permissionIds.userId,
        groupPermissionIds: permissionIds.groupPermissionIds,
        orgUnitPermissionIds: permissionIds.orgUnitPermissionIds,
        now,
        toolTake: POLICY_TOOL_TAKE,
      });

      const catalogs = await ctx.db.mcpCatalog.findMany({
        where: { deletedAt: null },
        select: {
          ...policySelect,
          name: true,
          tools: {
            ...policySelect.tools,
            select: {
              ...policySelect.tools.select,
              riskLevel: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: POLICY_MATRIX_CATALOG_LIMIT + 1,
      });

      const limitedCatalogs = ensureWithinLimit(
        catalogs,
        POLICY_MATRIX_CATALOG_LIMIT,
        "カタログ数",
      );
      const toolOverflowCatalog = limitedCatalogs.find(
        (catalog) => catalog.tools.length > POLICY_TOOL_LIMIT,
      );
      if (toolOverflowCatalog) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `ツール数が上限(${POLICY_TOOL_LIMIT})を超えました。カタログを分割してください。`,
        });
      }

      return buildSummaryResponse({
        catalogs: limitedCatalogs,
        targetType,
        user,
        orgUnits,
      });
    }),

  getEffectivePermissions: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const { user, orgUnits } = await getPolicyContextForUser(
        input.userId,
        ctx.db,
      );
      if (!user) return null;

      const groupIds = user.groupMemberships.map(
        (membership) => membership.group.id,
      );
      const groupPermissionIds = toPermissionIds(
        groupIds,
        NO_GROUP_PERMISSION_ID,
      );
      const orgUnitIds = orgUnits.map((orgUnit) => orgUnit.id);
      const orgUnitPermissionIds = toPermissionIds(
        orgUnitIds,
        NO_ORG_UNIT_PERMISSION_ID,
      );

      const catalogs = await ctx.db.mcpCatalog.findMany({
        where: { deletedAt: null },
        select: buildCatalogPolicySelect({
          userId: input.userId,
          groupPermissionIds,
          orgUnitPermissionIds,
          now,
          toolTake: POLICY_TOOL_TAKE,
        }),
        take: POLICY_MATRIX_CATALOG_LIMIT + 1,
      });

      const limitedCatalogs = ensureWithinLimit(
        catalogs,
        POLICY_MATRIX_CATALOG_LIMIT,
        "カタログ数",
      );
      const toolOverflowCatalog = limitedCatalogs.find(
        (catalog) => catalog.tools.length > POLICY_TOOL_LIMIT,
      );
      if (toolOverflowCatalog) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `ツール数が上限(${POLICY_TOOL_LIMIT})を超えました。カタログを分割してください。`,
        });
      }

      return limitedCatalogs.map((catalog) => {
        const effective = evaluateCatalogPermissions(user, catalog, orgUnits);
        return {
          catalogId: catalog.id,
          slug: catalog.slug,
          permissions: effective.permissions,
          tools: catalog.tools.map((tool) => {
            const permission = effective.tools.get(tool.id) ?? {
              allowed: false,
              deniedReason: "not_granted",
            };
            return {
              toolId: tool.id,
              name: tool.name,
              ...permission,
            };
          }),
        };
      });
    }),
});
