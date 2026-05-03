import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

export const groupsRouter = createTRPCRouter({
  /** グループ一覧をメンバーシップカウント付きで取得 */
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.group.findMany({
      select: {
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
          select: {
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
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }),

  /** 特定グループのメンバー一覧を取得 */
  getMembers: adminProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userGroupMembership.findMany({
        where: { groupId: input.groupId },
        select: {
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
        },
      });
    }),

  /** 特定グループの同期ログ（最新20件）を取得 */
  getSyncLogs: adminProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.idpSyncLog.findMany({
        where: { groupId: input.groupId },
        select: {
          id: true,
          trigger: true,
          status: true,
          added: true,
          removed: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      });
    }),
});
