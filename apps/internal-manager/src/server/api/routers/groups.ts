import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { GroupSource, Prisma } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

export const GROUP_LIST_LIMIT = 200;
export const GROUP_MEMBER_LIST_LIMIT = 1000;

const groupNameSchema = z.string().trim().min(1).max(100);

const groupDescriptionSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const idpExternalIdSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? null : value))
  .nullable();

const membershipSelect = {
  id: true,
  userId: true,
  source: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

const groupListSelect = {
  id: true,
  name: true,
  description: true,
  source: true,
  provider: true,
  externalId: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
  memberships: {
    select: membershipSelect,
    orderBy: { createdAt: "asc" },
  },
} as const;

type AssertTumikiGroup = <T extends { source: GroupSource }>(
  group: T | null,
) => asserts group is T & { source: typeof GroupSource.TUMIKI };

const assertTumikiGroup: AssertTumikiGroup = (group) => {
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "グループが見つかりません",
    });
  }
  if (group.source !== GroupSource.TUMIKI) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "IdPグループは管理画面から変更できません",
    });
  }
};

export const groupsRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.group.findMany({
      select: groupListSelect,
      orderBy: { createdAt: "asc" },
      take: GROUP_LIST_LIMIT + 1,
    });
  }),

  getMembers: adminProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userGroupMembership.findMany({
        where: { groupId: input.groupId },
        select: membershipSelect,
        orderBy: { createdAt: "asc" },
        take: GROUP_MEMBER_LIST_LIMIT,
      });
    }),

  getSyncLogs: adminProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.idpSyncLog.findMany({
        where: { groupId: input.groupId },
        select: {
          id: true,
          trigger: true,
          status: true,
          added: true,
          removed: true,
          detail: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      });
    }),

  createTumikiGroup: adminProcedure
    .input(
      z.object({
        name: groupNameSchema,
        description: groupDescriptionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          source: GroupSource.TUMIKI,
          provider: null,
          externalId: null,
        },
        select: groupListSelect,
      });
    }),

  updateTumikiGroup: adminProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        name: groupNameSchema,
        description: groupDescriptionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: input.groupId },
          select: { source: true },
        });
        assertTumikiGroup(group);

        return tx.group.update({
          where: { id: input.groupId },
          data: {
            name: input.name,
            description: input.description ?? null,
          },
          select: groupListSelect,
        });
      });
    }),

  updateTumikiGroupWithMapping: adminProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        name: groupNameSchema,
        description: groupDescriptionSchema,
        // 管理UIの手動mappingはSCIM/JIT共通のTumiki group mappingとして扱う。
        provider: z.literal("scim-map").default("scim-map"),
        externalId: idpExternalIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: input.groupId },
          select: { source: true },
        });
        assertTumikiGroup(group);

        try {
          return await tx.group.update({
            where: { id: input.groupId },
            data: {
              name: input.name,
              description: input.description ?? null,
              provider: input.externalId ? input.provider : null,
              externalId: input.externalId,
            },
            select: groupListSelect,
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "そのIdPグループ識別子は既に別のグループに使用されています",
            });
          }
          throw error;
        }
      });
    }),

  deleteTumikiGroup: adminProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: input.groupId },
          select: { source: true, _count: { select: { memberships: true } } },
        });
        assertTumikiGroup(group);
        if (group._count.memberships > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "メンバーが残っているグループは削除できません",
          });
        }

        return tx.group.delete({
          where: { id: input.groupId },
          select: { id: true },
        });
      });
    }),

  addMember: adminProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const [group, user] = await Promise.all([
          tx.group.findUnique({
            where: { id: input.groupId },
            select: { source: true },
          }),
          tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true, isActive: true },
          }),
        ]);
        assertTumikiGroup(group);

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

        try {
          return await tx.userGroupMembership.create({
            data: {
              groupId: input.groupId,
              userId: input.userId,
              source: GroupSource.TUMIKI,
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
              message: "このユーザーは既にグループに所属しています",
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
        const membership = await tx.userGroupMembership.findUnique({
          where: { id: input.membershipId },
          select: {
            id: true,
            source: true,
            group: { select: { source: true } },
          },
        });
        if (!membership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "メンバーシップが見つかりません",
          });
        }
        if (
          membership.group.source !== GroupSource.TUMIKI ||
          membership.source !== GroupSource.TUMIKI
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "IdPグループまたはIdP由来のメンバーシップは管理画面から削除できません",
          });
        }

        return tx.userGroupMembership.delete({
          where: { id: input.membershipId },
          select: { id: true },
        });
      });
    }),

  // 表示フィールドを変更せず IdP mapping のみ更新する既存呼び出し元のために残す
  updateIdpMapping: adminProcedure
    .input(
      z.object({
        groupId: z.string().min(1),
        // 管理UIの手動mappingはSCIM/JIT共通のTumiki group mappingとして扱う。
        provider: z.literal("scim-map").default("scim-map"),
        externalId: idpExternalIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const group = await tx.group.findUnique({
          where: { id: input.groupId },
          select: { source: true },
        });
        assertTumikiGroup(group);

        try {
          return await tx.group.update({
            where: { id: input.groupId },
            data: {
              provider: input.externalId ? input.provider : null,
              externalId: input.externalId,
            },
            select: {
              id: true,
              provider: true,
              externalId: true,
              updatedAt: true,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "そのIdPグループ識別子は既に別のグループに使用されています",
            });
          }
          throw error;
        }
      });
    }),
});
