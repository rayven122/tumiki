import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  sendSlackMessage,
  createFeedbackNotification,
} from "@tumiki/slack-notifier";
import { FeedbackIdSchema } from "@/schema/ids";
import type { FeedbackType, Prisma } from "@tumiki/db";

// 入力スキーマ
const createFeedbackInputSchema = z.object({
  type: z.enum(["INQUIRY", "FEATURE_REQUEST"], {
    message: "有効なフィードバック種類を選択してください",
  }),
  subject: z
    .string()
    .min(1, "件名を入力してください")
    .max(200, "件名は200文字以内で入力してください"),
  content: z
    .string()
    .min(1, "内容を入力してください")
    .max(5000, "内容は5000文字以内で入力してください"),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// 出力スキーマ
const createFeedbackOutputSchema = z.object({
  id: FeedbackIdSchema,
  success: z.boolean(),
  message: z.string(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>;
export type CreateFeedbackOutput = z.infer<typeof createFeedbackOutputSchema>;

const FEEDBACK_MESSAGES = {
  SUCCESS: "フィードバックを送信しました。ご連絡ありがとうございます。",
  FAILED:
    "フィードバックの送信に失敗しました。しばらく後に再試行してください。",
  SLACK_NOTIFICATION_FAILED: "Slack通知送信に失敗しました:",
} as const;

/**
 * Slack通知を送信する（非同期、エラーは握りつぶす）
 */
const sendSlackNotification = async (feedbackData: {
  type: FeedbackType;
  subject: string;
  content: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  feedbackId: string;
}): Promise<void> => {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("SLACK_WEBHOOK_URL is not configured");
      return;
    }

    const message = createFeedbackNotification({
      feedbackId: feedbackData.feedbackId,
      type: feedbackData.type,
      subject: feedbackData.subject,
      content: feedbackData.content,
      userName: feedbackData.userName,
      userEmail: feedbackData.userEmail,
      organizationName: feedbackData.organizationName,
    });

    void sendSlackMessage(webhookUrl, message).catch((error: unknown) => {
      console.error(FEEDBACK_MESSAGES.SLACK_NOTIFICATION_FAILED, error);
    });
  } catch (error: unknown) {
    console.error(FEEDBACK_MESSAGES.SLACK_NOTIFICATION_FAILED, error);
    // エラーを握りつぶす（ユーザーには影響させない）
  }
};

// tRPCルーター定義
export const feedbackRouter = createTRPCRouter({
  /**
   * フィードバックを作成する
   */
  create: protectedProcedure
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
    }),
});
