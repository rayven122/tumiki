import type { FeedbackType } from "@tumiki/db";
import {
  sendSlackMessage,
  createFeedbackNotification,
} from "@tumiki/slack-notifier";

const FEEDBACK_MESSAGES = {
  SUCCESS: "フィードバックを送信しました。ご連絡ありがとうございます。",
  FAILED:
    "フィードバックの送信に失敗しました。しばらく後に再試行してください。",
  SLACK_NOTIFICATION_FAILED: "Slack通知送信に失敗しました:",
} as const;

export { FEEDBACK_MESSAGES };

/**
 * Slack通知を送信する（非同期、エラーは握りつぶす）
 */
export const sendSlackNotification = async (feedbackData: {
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

    const result = await sendSlackMessage(webhookUrl, message);
    if (!result.success) {
      console.error(
        FEEDBACK_MESSAGES.SLACK_NOTIFICATION_FAILED,
        result.error ?? "Unknown error",
      );
    }
  } catch (error: unknown) {
    console.error(FEEDBACK_MESSAGES.SLACK_NOTIFICATION_FAILED, error);
    // エラーを握りつぶす（ユーザーには影響させない）
  }
};
