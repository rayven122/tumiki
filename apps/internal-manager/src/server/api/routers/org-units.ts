import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const buildPath = (parentPath: string | null, segment: string) =>
  parentPath ? `${parentPath}/${segment}` : `/${segment}`;
const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

const ORG_UNIT_TREE_LIMIT = 1000;

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
      take: ORG_UNIT_TREE_LIMIT,
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "部署を自分自身の配下には移動できません",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const current = await tx.orgUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { id: true, externalId: true, path: true },
        });
        if (!current) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "部署が見つかりません",
          });
        }
        const parent = input.parentId
          ? await tx.orgUnit.findUnique({
              where: { id: input.parentId },
              select: { id: true, path: true },
            })
          : null;

        if (input.parentId && !parent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "移動先の部署が見つかりません",
          });
        }
        if (parent?.path.startsWith(`${current.path}/`)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "部署を自身の子孫配下には移動できません",
          });
        }

        const newPath = buildPath(parent?.path ?? null, current.externalId);

        const updated = await tx.orgUnit.update({
          where: { id: current.id },
          data: {
            parentId: input.parentId,
            path: newPath,
          },
        });

        await tx.$executeRaw`
          UPDATE "OrgUnit"
          SET
            "path" = ${newPath} || substring("path" from ${current.path.length + 1}),
            "updatedAt" = NOW()
          WHERE "path" LIKE ${`${escapeLikePattern(current.path)}/%`} ESCAPE ${"\\"}
        `;

        return updated;
      });
    }),
});
