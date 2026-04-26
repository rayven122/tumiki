import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const usersRouter = createTRPCRouter({
  /** ユーザー一覧（ロール・ステータス・名前検索対応） */
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["SYSTEM_ADMIN", "USER", "all"]).default("all"),
        isActive: z.enum(["true", "false", "all"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { groupMemberships: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),
});
