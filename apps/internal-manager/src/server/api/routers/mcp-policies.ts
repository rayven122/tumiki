import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PolicyEffect } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  evaluateCatalogPermissions,
  getPolicyContextForUser,
} from "~/server/mcp-policy/effective-permissions";

const POLICY_MATRIX_ORG_UNIT_LIMIT = 1000;
const POLICY_MATRIX_CATALOG_LIMIT = 200;

export const mcpPoliciesRouter = createTRPCRouter({
  getMatrix: adminProcedure.query(async ({ ctx }) => {
    const [orgUnits, catalogs] = await Promise.all([
      ctx.db.orgUnit.findMany({
        orderBy: [{ path: "asc" }, { name: "asc" }],
        take: POLICY_MATRIX_ORG_UNIT_LIMIT,
      }),
      ctx.db.mcpCatalog.findMany({
        where: { deletedAt: null },
        include: {
          tools: {
            where: { deletedAt: null },
            include: {
              orgUnitPermissions: true,
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
      const tool = await ctx.db.mcpCatalogTool.findUnique({
        where: { id: input.toolId },
        select: { catalogId: true },
      });
      if (!tool || tool.catalogId !== input.catalogId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ツールが指定カタログに属していません",
        });
      }

      if (input.effect === null) {
        await ctx.db.orgUnitToolPermission.deleteMany({
          where: {
            orgUnitId: input.orgUnitId,
            toolId: input.toolId,
          },
        });
        return { ok: true };
      }
      const effect = input.effect;

      await ctx.db.orgUnitToolPermission.upsert({
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
          catalogId: input.catalogId,
          effect,
        },
      });
      return { ok: true };
    }),

  getEffectivePermissions: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [{ user, orgUnits }, catalogs] = await Promise.all([
        getPolicyContextForUser(input.userId, ctx.db),
        ctx.db.mcpCatalog.findMany({
          where: { deletedAt: null },
          include: {
            tools: {
              where: { deletedAt: null },
              include: { orgUnitPermissions: true },
            },
          },
          take: POLICY_MATRIX_CATALOG_LIMIT,
        }),
      ]);
      if (!user) return null;

      return catalogs.map((catalog) => {
        const effective = evaluateCatalogPermissions(user, catalog, orgUnits);
        return {
          catalogId: catalog.id,
          slug: catalog.slug,
          permissions: effective.permissions,
          tools: catalog.tools.map((tool) => ({
            toolId: tool.id,
            name: tool.name,
            ...effective.tools.get(tool.id),
          })),
        };
      });
    }),
});
