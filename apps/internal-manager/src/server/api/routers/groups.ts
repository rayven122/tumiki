import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { GroupSource, Prisma } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

export const GROUP_LIST_LIMIT = 200;

const idpExternalIdSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? null : value))
  .nullable();

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
      take: GROUP_LIST_LIMIT + 1,
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
          detail: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      });
    }),

  /** Tumikiグループに対応するIdPグループ識別子を設定する */
  updateIdpMapping: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
        // 管理UIの手動mappingはSCIM/JIT共通のTumiki group mappingとして扱う。
        provider: z.literal("scim-map").default("scim-map"),
        externalId: idpExternalIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
        select: { source: true },
      });
      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (group.source !== GroupSource.TUMIKI) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "IdPグループのマッピングはTumiki作成グループにのみ設定できます",
        });
      }

      try {
        return await ctx.db.group.update({
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
    }),
});
