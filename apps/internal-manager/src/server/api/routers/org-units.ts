import { z } from "zod";
import { OrgUnitSource } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const buildPath = (parentPath: string | null, id: string) =>
  parentPath ? `${parentPath}/${id}` : `/${id}`;

export const orgUnitsRouter = createTRPCRouter({
  tree: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.orgUnit.findMany({
      include: {
        memberships: {
          select: {
            id: true,
            isPrimary: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        permissions: {
          select: {
            id: true,
            effect: true,
            catalogId: true,
            toolId: true,
          },
        },
      },
      orderBy: [{ path: "asc" }, { name: "asc" }],
    });
  }),

  listUsers: adminProcedure
    .input(z.object({ orgUnitId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userOrgUnitMembership.findMany({
        where: { orgUnitId: input.orgUnitId },
        select: {
          id: true,
          isPrimary: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              scimDepartment: true,
              scimManagerDisplayName: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateParent: adminProcedure
    .input(
      z.object({
        orgUnitId: z.string().min(1),
        parentId: z.string().min(1).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.orgUnitId === input.parentId) {
        throw new Error("部署を自分自身の配下には移動できません");
      }

      const parent = input.parentId
        ? await ctx.db.orgUnit.findUnique({
            where: { id: input.parentId },
            select: { path: true },
          })
        : null;

      return ctx.db.orgUnit.update({
        where: { id: input.orgUnitId },
        data: {
          parentId: input.parentId,
          source: OrgUnitSource.MANUAL,
          path: buildPath(parent?.path ?? null, input.orgUnitId),
        },
      });
    }),
});
