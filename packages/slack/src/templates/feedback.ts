import type { FeedbackType } from "@tumiki/db";

import type { SlackMessage } from "../client.js";

export type FeedbackNotificationData = {
  feedbackId: string;
  type: FeedbackType;
  subject: string;
  content: string;
  userName: string;
  userEmail: string;
  organizationName: string;
};

export const makeFeedbackSlackMessage = (
  data: FeedbackNotificationData,
): SlackMessage => {
  // 種別に応じた絵文字とラベル
  const typeEmoji = data.type === "INQUIRY" ? "💬" : "💡";
  const typeLabel = data.type === "INQUIRY" ? "お問い合わせ" : "機能要望";

  // 内容を適切な長さに制限（Slackの制限を考慮）
  // Slack Block Kitのtext fieldは3000文字まで
  // プレフィックス「📝 *内容*\n」を考慮して制限を設定
  const prefix = "📝 *内容*\n";
  const suffix = "...\n_（内容が長いため省略されました）_";
  const maxContentLength = 3000 - prefix.length - suffix.length;
  const truncatedContent =
    data.content.length > maxContentLength
      ? `${data.content.slice(0, maxContentLength)}${suffix}`
      : data.content;

  return {
    text: `${typeEmoji} 新しい${typeLabel}: ${data.subject}`,
    blocks: [
      // ヘッダー: 種別を絵文字付きで表示
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${typeEmoji} ${typeLabel}`,
          emoji: true,
        },
      },
      // 件名を目立たせる
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.subject}*`,
        },
      },
      // 区切り線
      {
        type: "divider",
      },
      // 内容（最も重要な情報）
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📝 *内容*\n${truncatedContent}`,
        },
      },
      // 区切り線
      {
        type: "divider",
      },
      // ユーザー情報と組織情報をコンパクトに
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `👤 *${data.userName}* (${data.userEmail})`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🏢 ${data.organizationName}`,
          },
        ],
      },
      // フィードバックIDは最後にコンパクトに
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🔖 Feedback ID: \`${data.feedbackId}\``,
          },
        ],
      },
    ],
  };
};
