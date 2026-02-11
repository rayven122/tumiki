import type { FeedbackType, PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { sendSlackMessage, makeFeedbackSlackMessage } from "@tumiki/slack";
import { FeedbackIdSchema } from "@/schema/ids";
import {
  createFeedbackInputSchema,
  createFeedbackOutputSchema,
  type CreateFeedbackData,
} from "./schemas";

export { createFeedbackInputSchema, createFeedbackOutputSchema };

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

    const message = makeFeedbackSlackMessage(feedbackData);
    await sendSlackMessage(webhookUrl, message);
  } catch (error: unknown) {
    console.error(
      FEEDBACK_MESSAGES.SLACK_NOTIFICATION_FAILED,
      error instanceof Error ? error.message : String(error),
    );
    // エラーを握りつぶす（ユーザーには影響させない）
  }
};

/**
 * フィードバックを作成
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 作成データ
 * @returns 作成されたフィードバック情報
 */
export const createFeedback = async (
  tx: PrismaTransactionClient,
  input: CreateFeedbackData,
) => {
  try {
    // フィードバックをデータベースに保存
    const feedback = await tx.feedback.create({
      data: {
        ...input,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

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
};
