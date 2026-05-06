import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma, Role } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  externalIdentities: {
    select: { provider: true },
    orderBy: { lastSyncedAt: "desc" },
    take: 1,
  },
  _count: {
    select: {
      desktopAuditLogs: true,
      externalIdentities: true,
      groupMemberships: true,
    },
  },
} as const;

const assertCanRemoveSystemAdminAccess = async ({
  db,
  targetUserId,
}: {
  db: {
    user: {
      count: (args: {
        where: { role: Role; isActive: boolean; id?: { not: string } };
      }) => Promise<number>;
    };
  };
  targetUserId: string;
}) => {
  const remainingActiveSystemAdmins = await db.user.count({
    where: {
      role: Role.SYSTEM_ADMIN,
      isActive: true,
      id: { not: targetUserId },
    },
  });

  if (remainingActiveSystemAdmins === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "最後のSYSTEM_ADMINは変更できません",
    });
  }
};

export const usersRouter = createTRPCRouter({
  /** ユーザー一覧（ロール・ステータス・名前検索対応） */
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["SYSTEM_ADMIN", "USER", "all"]).default("all"),
        isActive: z.enum(["true", "false", "all"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          ...(input.role !== "all" ? { role: input.role } : {}),
          ...(input.isActive !== "all"
            ? { isActive: input.isActive === "true" }
            : {}),
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { email: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: userSelect,
        orderBy: { createdAt: "asc" },
        take: 200,
      });

      const userIds = users.map((user) => user.id);
      if (userIds.length === 0) {
        return users.map((user) => ({
          ...user,
          lastUsedAt: null,
        }));
      }

      const lastUsageRows = await ctx.db.desktopAuditLog.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _max: { occurredAt: true },
      });

      const lastUsedAtByUserId = new Map(
        lastUsageRows.map((row) => [row.userId, row._max.occurredAt] as const),
      );

      return users.map((user) => ({
        ...user,
        lastUsedAt: lastUsedAtByUserId.get(user.id) ?? null,
      }));
    }),

  updateActive: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id && !input.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "自分自身を無効化することはできません",
        });
      }

      return ctx.db.$transaction(
        async (tx) => {
          const targetUser = await tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true, role: true, isActive: true },
          });

          if (!targetUser) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "ユーザーが見つかりません",
            });
          }

          if (
            !input.isActive &&
            targetUser.isActive &&
            targetUser.role === Role.SYSTEM_ADMIN
          ) {
            await assertCanRemoveSystemAdminAccess({
              db: tx,
              targetUserId: input.userId,
            });
          }

          return tx.user.update({
            where: { id: input.userId },
            data: { isActive: input.isActive },
            select: userSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.nativeEnum(Role),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        input.userId === ctx.session.user.id &&
        input.role !== Role.SYSTEM_ADMIN
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "自分自身を降格することはできません",
        });
      }

      return ctx.db.$transaction(
        async (tx) => {
          const targetUser = await tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true, role: true, isActive: true },
          });

          if (!targetUser) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "ユーザーが見つかりません",
            });
          }

          if (
            targetUser.role === Role.SYSTEM_ADMIN &&
            input.role !== Role.SYSTEM_ADMIN &&
            targetUser.isActive
          ) {
            await assertCanRemoveSystemAdminAccess({
              db: tx,
              targetUserId: input.userId,
            });
          }

          return tx.user.update({
            where: { id: input.userId },
            data: { role: input.role },
            select: userSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }),

  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "自分自身を削除することはできません",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const targetUser = await tx.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            isActive: true,
            _count: { select: { externalIdentities: true } },
          },
        });

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ユーザーが見つかりません",
          });
        }

        if (targetUser.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "利用中ユーザーは削除できません",
          });
        }

        if (targetUser._count.externalIdentities > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "IdP/SAML/SCIMで同期されたユーザーはTumikiから削除できません",
          });
        }

        return tx.user.delete({
          where: { id: input.userId },
          select: { id: true },
        });
      });
    }),
});
