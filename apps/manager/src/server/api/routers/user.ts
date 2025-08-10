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

        return dbUser;
      } catch (error) {
        console.error("Failed to sync user to database:", error);
        throw new Error("User synchronization failed");
      }
    }),

  // オンボーディング状況をチェック（個人組織の存在で判断）
  checkOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // ユーザーが個人組織を持っているか確認
    const personalOrg = await ctx.db.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          isPersonal: true,
          isDeleted: false,
        },
      },
    });

    return {
      isOnboardingCompleted: !!personalOrg,
    };
  }),

  // オンボーディング完了をマーク（個人組織を作成）
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // 既に個人組織が存在するか確認
    const existingOrg = await ctx.db.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          isPersonal: true,
          isDeleted: false,
        },
      },
    });

    if (!existingOrg) {
      // ユーザー情報を取得
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // 個人組織を作成
      await ctx.db.organization.create({
        data: {
          name: `${user.name ?? user.email ?? "User"}'s Workspace`,
          description: "Personal workspace",
          isPersonal: true,
          maxMembers: 1,
          createdBy: userId,
          members: {
            create: {
              userId,
              isAdmin: true,
            },
          },
        },
      });
    }

    return { success: true };
  }),
});
