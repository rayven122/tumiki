import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "部署を自分自身の配下には移動できません",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const current = await tx.orgUnit.findUniqueOrThrow({
          where: { id: input.orgUnitId },
          select: { id: true, path: true },
        });
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

        const newPath = buildPath(parent?.path ?? null, current.id);
        const descendants = await tx.orgUnit.findMany({
          where: { path: { startsWith: `${current.path}/` } },
          select: { id: true, path: true },
        });

        const updated = await tx.orgUnit.update({
          where: { id: current.id },
          data: {
            parentId: input.parentId,
            source: OrgUnitSource.MANUAL,
            path: newPath,
          },
        });

        await Promise.all(
          descendants.map((descendant) =>
            tx.orgUnit.update({
              where: { id: descendant.id },
              data: {
                path: `${newPath}${descendant.path.slice(current.path.length)}`,
              },
            }),
          ),
        );

        return updated;
      });
    }),
});
