import type { SlackMessage } from "../types/index.js";

export type FeedbackNotificationData = {
  type: "INQUIRY" | "FEATURE_REQUEST";
  subject: string;
  content: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  feedbackUrl: string;
};

export const createFeedbackNotification = (
  data: FeedbackNotificationData,
): SlackMessage => {
  const typeLabel = data.type === "INQUIRY" ? "お問い合わせ" : "機能要望";
  const emoji = data.type === "INQUIRY" ? "💬" : "✨";

  return {
    text: `${emoji} 新しい${typeLabel}が送信されました`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${typeLabel}`,
        },
      },
      {
        type: "section",
        fields: [
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
          text: `*内容:*\n${truncateText(data.content, 2000)}`,
        },
      },
      {
        type: "divider",
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "詳細を見る",
              emoji: true,
            },
            url: data.feedbackUrl,
            style: "primary",
          },
        ],
      },
    ],
  };
};

// テキストを指定文字数で切り詰める
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
};
