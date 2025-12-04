import type { FeedbackType } from "@tumiki/db";
import type { SlackMessage } from "../types/index.js";

export type FeedbackNotificationData = {
  feedbackId: string;
  type: FeedbackType;
  subject: string;
  content: string;
  userName: string;
  userEmail: string;
  organizationName: string;
};

export const createFeedbackNotification = (
  data: FeedbackNotificationData,
): SlackMessage => {
  const typeLabel = data.type === "INQUIRY" ? "お問い合わせ" : "機能要望";

  return {
    text: `新しい${typeLabel}が送信されました`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: typeLabel,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*フィードバックID:*\n${data.feedbackId}`,
          },
          {
            type: "mrkdwn",
            text: `*件名:*\n${data.subject}`,
          },
          {
            type: "mrkdwn",
            text: `*送信者:*\n${data.userName}\n${data.userEmail}`,
          },
          {
            type: "mrkdwn",
            text: `*組織:*\n${data.organizationName}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*内容:*\n${data.content}`,
        },
      },
    ],
  };
};
