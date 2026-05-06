import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PolicyEffect } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  evaluateCatalogPermissions,
  getPolicyContextForUser,
} from "~/server/mcp-policy/effective-permissions";
import {
  NO_GROUP_PERMISSION_ID,
  NO_ORG_UNIT_PERMISSION_ID,
} from "~/server/mcp-policy/constants";

const POLICY_MATRIX_ORG_UNIT_LIMIT = 1000;
const POLICY_MATRIX_CATALOG_LIMIT = 200;

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
          orderBy: [{ path: "asc" }, { name: "asc" }],
          take: POLICY_MATRIX_ORG_UNIT_LIMIT,
        }),
        ctx.db.mcpCatalog.findMany({
          where: { deletedAt: null },
          include: {
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
              include: {
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
          take: POLICY_MATRIX_CATALOG_LIMIT,
        }),
      ]);

      return { orgUnits, catalogs };
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
            where: { id: input.toolId, deletedAt: null },
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
            catalogId: input.catalogId,
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
      const groupPermissionIds =
        groupIds.length > 0 ? groupIds : [NO_GROUP_PERMISSION_ID];
      const orgUnitIds = orgUnits.map((orgUnit) => orgUnit.id);
      const orgUnitPermissionIds =
        orgUnitIds.length > 0 ? orgUnitIds : [NO_ORG_UNIT_PERMISSION_ID];

      const catalogs = await ctx.db.mcpCatalog.findMany({
        where: { deletedAt: null },
        include: {
          orgUnitCatalogPermissions: {
            where: { orgUnitId: { in: orgUnitPermissionIds } },
          },
          groupCatalogPermissions: {
            where: { groupId: { in: groupPermissionIds } },
          },
          userCatalogPermissions: {
            where: {
              userId: input.userId,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
          tools: {
            where: { deletedAt: null },
            include: {
              orgUnitPermissions: {
                where: { orgUnitId: { in: orgUnitPermissionIds } },
              },
              groupPermissions: {
                where: { groupId: { in: groupPermissionIds } },
              },
              userPermissions: {
                where: {
                  userId: input.userId,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
          },
        },
        take: POLICY_MATRIX_CATALOG_LIMIT,
      });

      return catalogs.map((catalog) => {
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
