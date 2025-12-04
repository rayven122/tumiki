import { TRPCError } from "@trpc/server";
import type { Prisma } from "@tumiki/db";
import { FeedbackIdSchema } from "@/schema/ids";
import { protectedProcedure } from "@/server/api/trpc";
import {
  createFeedbackInputSchema,
  createFeedbackOutputSchema,
} from "./schemas";
import { FEEDBACK_MESSAGES, sendSlackNotification } from "./helpers";

/**
 * フィードバックを作成する
 */
export const create = protectedProcedure
  .input(createFeedbackInputSchema)
  .output(createFeedbackOutputSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      // フィードバックをデータベースに保存
      const feedback = (await ctx.db.feedback.create({
        data: {
          type: input.type,
          subject: input.subject,
          content: input.content,
          userId: ctx.session.user.id,
          organizationId: ctx.currentOrganizationId,
          userAgent: input.userAgent,
          metadata: input.metadata,
          status: "PENDING",
        },
        include: {
          user: true,
          organization: true,
        },
      })) as Prisma.FeedbackGetPayload<{
        include: { user: true; organization: true };
      }>;

      // Slack通知送信（非同期、エラーは握りつぶす）
      void sendSlackNotification({
        type: feedback.type,
        subject: feedback.subject,
        content: feedback.content,
        userName: feedback.user.name ?? "Unknown User",
        userEmail: feedback.user.email ?? "no-email@example.com",
        organizationName: feedback.organization.name,
        feedbackId: feedback.id,
      });

      return {
        id: FeedbackIdSchema.parse(feedback.id),
        success: true,
        message: FEEDBACK_MESSAGES.SUCCESS,
      };
    } catch (error) {
      console.error("フィードバック作成エラー:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: FEEDBACK_MESSAGES.FAILED,
      });
    }
  });
