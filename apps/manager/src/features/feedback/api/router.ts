import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  createFeedback,
  createFeedbackInputSchema,
  createFeedbackOutputSchema,
} from "./createFeedback";

/**
 * v2 Feedback Router
 *
 * フィードバック管理に関する API
 * - create: フィードバックを作成
 */
export const feedbackRouter = createTRPCRouter({
  // フィードバック作成
  create: protectedProcedure
    .input(createFeedbackInputSchema)
    .output(createFeedbackOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await createFeedback(ctx.db, {
        userId: ctx.session.user.id,
        organizationId: ctx.currentOrg.id,
        ...input,
      });
    }),
});

// スキーマの型をエクスポート
export type { CreateFeedbackInput, CreateFeedbackOutput } from "./schemas";
