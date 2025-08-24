import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

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
});
