import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

// Auth0 Post-Login Actionから送信されるユーザー情報のスキーマ
export const syncUserFromAuth0Schema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  picture: z.string().url().optional(),
});

export const userRouter = createTRPCRouter({
  // Auth0 Post-Login Action用のユーザー同期エンドポイント
  syncUserFromAuth0: publicProcedure
    .input(syncUserFromAuth0Schema)
    .mutation(async ({ ctx, input }) => {
      try {
        const dbUser = await ctx.db.user.upsert({
          where: {
            id: input.sub,
          },
          update: {
            name: input.name ?? null,
            email: input.email ?? null,
            image: input.picture ?? null,
            updatedAt: new Date(),
          },
          create: {
            id: input.sub,
            name: input.name ?? null,
            email: input.email ?? null,
            image: input.picture ?? null,
            role: "USER",
          },
        });

        console.log(`User ${input.sub} synchronized to database:`, {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
        });

        return dbUser;
      } catch (error) {
        console.error("Failed to sync user to database:", error);
        throw new Error("User synchronization failed");
      }
    }),

  // オンボーディング状況をチェック
  checkOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    if (!user) return { isOnboardingCompleted: false };

    // 作成から5分以内なら初回ログインとみなす
    const isFirstLogin = Date.now() - user.createdAt.getTime() < 5 * 60 * 1000;

    return {
      isOnboardingCompleted: !isFirstLogin
    };
  }),
});
