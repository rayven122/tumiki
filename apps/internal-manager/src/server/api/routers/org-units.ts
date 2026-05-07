import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrgUnitSource, Prisma } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const buildPath = (parentPath: string | null, segment: string) =>
  parentPath ? `${parentPath}/${segment}` : `/${segment}`;
const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

const ORG_UNIT_TREE_LIMIT = 1000;
const LIST_USERS_LIMIT = 1000;

const orgUnitNameSchema = z.string().trim().min(1).max(100);

const orgUnitSelect = {
  id: true,
  name: true,
  externalId: true,
  source: true,
  path: true,
  parentId: true,
  lastSyncedAt: true,
  memberships: {
    select: {
      id: true,
      isPrimary: true,
      user: { select: { id: true, name: true, email: true, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  permissions: {
    select: {
      id: true,
      effect: true,
      catalogId: true,
      toolId: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

const membershipSelect = {
  id: true,
  isPrimary: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      scimDepartment: true,
      scimManagerDisplayName: true,
    },
  },
} as const;

function assertManualOrgUnit(
  orgUnit: { source: OrgUnitSource } | null,
): asserts orgUnit is { source: OrgUnitSource } {
  if (!orgUnit) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "部署が見つかりません",
    });
  }
  if (orgUnit.source !== OrgUnitSource.MANUAL) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "SCIM/IdP由来の部署は管理画面から変更できません",
    });
  }
}

export const orgUnitsRouter = createTRPCRouter({
  tree: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.orgUnit.findMany({
      select: orgUnitSelect,
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
        take: LIST_USERS_LIMIT,
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
          select: { id: true, externalId: true, path: true, source: true },
        });
        assertManualOrgUnit(current);
        const parent = input.parentId
          ? await tx.orgUnit.findUnique({
              where: { id: input.parentId },
              select: { id: true, path: true },
            })
          : null;

        if (input.parentId && !parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
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
            "path" = ${newPath} || substring("path" from ${(current.path.length + 1).toString()}::integer),
            "updatedAt" = NOW()
          WHERE "path" LIKE ${`${escapeLikePattern(current.path)}/%`} ESCAPE ${"\\"}
        `;

        return updated;
      });
    }),

  createManualOrgUnit: adminProcedure
    .input(
      z.object({
        name: orgUnitNameSchema,
        parentId: z.string().min(1).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const parent = input.parentId
        ? await ctx.db.orgUnit.findUnique({
            where: { id: input.parentId },
            select: { id: true, path: true },
          })
        : null;
      if (input.parentId && !parent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "親部署が見つかりません",
        });
      }

      const externalId = `manual:${randomUUID()}`;
      return ctx.db.orgUnit.create({
        data: {
          name: input.name,
          externalId,
          source: OrgUnitSource.MANUAL,
          parentId: parent?.id ?? null,
          path: buildPath(parent?.path ?? null, externalId),
        },
        select: orgUnitSelect,
      });
    }),

  updateManualOrgUnit: adminProcedure
    .input(
      z.object({
        orgUnitId: z.string().min(1),
        name: orgUnitNameSchema,
        parentId: z.string().min(1).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const current = await tx.orgUnit.findUnique({
          where: { id: input.orgUnitId },
          select: { id: true, externalId: true, path: true, source: true },
        });
        assertManualOrgUnit(current);

        const parent = input.parentId
          ? await tx.orgUnit.findUnique({
              where: { id: input.parentId },
              select: { id: true, path: true },
            })
          : null;

        if (input.parentId && !parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "親部署が見つかりません",
          });
        }
        if (input.orgUnitId === input.parentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "部署を自分自身の配下には移動できません",
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
            name: input.name,
            parentId: input.parentId ?? null,
            path: newPath,
          },
          select: orgUnitSelect,
        });

        await tx.$executeRaw`
          UPDATE "OrgUnit"
          SET
            "path" = ${newPath} || substring("path" from ${(current.path.length + 1).toString()}::integer),
            "updatedAt" = NOW()
          WHERE "path" LIKE ${`${escapeLikePattern(current.path)}/%`} ESCAPE ${"\\"}
        `;

        return updated;
      });
    }),

  deleteManualOrgUnit: adminProcedure
    .input(z.object({ orgUnitId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const orgUnit = await tx.orgUnit.findUnique({
          where: { id: input.orgUnitId },
          select: {
            id: true,
            source: true,
            _count: { select: { children: true } },
          },
        });
        assertManualOrgUnit(orgUnit);
        if (orgUnit._count.children > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "子部署がある部署は削除できません",
          });
        }

        return tx.orgUnit.delete({
          where: { id: input.orgUnitId },
          select: { id: true },
        });
      });
    }),

  addMember: adminProcedure
    .input(
      z.object({
        orgUnitId: z.string().min(1),
        userId: z.string().min(1),
        isPrimary: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const [orgUnit, user] = await Promise.all([
          tx.orgUnit.findUnique({
            where: { id: input.orgUnitId },
            select: { source: true },
          }),
          tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true, isActive: true },
          }),
        ]);
        assertManualOrgUnit(orgUnit);
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ユーザーが見つかりません",
          });
        }
        if (!user.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "無効化されたユーザーは追加できません",
          });
        }

        if (input.isPrimary) {
          await tx.userOrgUnitMembership.updateMany({
            where: {
              userId: input.userId,
              isPrimary: true,
              orgUnitId: { not: input.orgUnitId },
            },
            data: { isPrimary: false },
          });
        }

        try {
          return await tx.userOrgUnitMembership.create({
            data: {
              orgUnitId: input.orgUnitId,
              userId: input.userId,
              isPrimary: input.isPrimary,
            },
            select: membershipSelect,
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "このユーザーは既に部署に所属しています",
            });
          }
          throw error;
        }
      });
    }),

  removeMember: adminProcedure
    .input(z.object({ membershipId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const membership = await tx.userOrgUnitMembership.findUnique({
          where: { id: input.membershipId },
          select: {
            id: true,
            orgUnit: { select: { source: true } },
          },
        });
        if (!membership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "メンバーシップが見つかりません",
          });
        }
        assertManualOrgUnit(membership.orgUnit);

        return tx.userOrgUnitMembership.delete({
          where: { id: input.membershipId },
          select: { id: true },
        });
      });
    }),
});
