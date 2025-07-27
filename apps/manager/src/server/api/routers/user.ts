import { z } from "zod";
import { extractUserIdFromSub } from "@tumiki/utils";
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
        // Auth0 sub から userId を抽出
        const userId = extractUserIdFromSub(input.sub);

        const dbUser = await ctx.db.user.upsert({
          where: {
            id: userId,
          },
          update: {
            name: input.name ?? null,
            email: input.email ?? null,
            image: input.picture ?? null,
            updatedAt: new Date(),
          },
          create: {
            id: userId,
            name: input.name ?? null,
            email: input.email ?? null,
            image: input.picture ?? null,
            role: "USER",
          },
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
      select: { hasCompletedOnboarding: true },
    });

    if (!user) return { isOnboardingCompleted: false };

    return {
      isOnboardingCompleted: user.hasCompletedOnboarding,
    };
  }),

  // オンボーディング完了をマーク
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    await ctx.db.user.update({
      where: { id: userId },
      data: { hasCompletedOnboarding: true },
    });

    return { success: true };
  }),
});
