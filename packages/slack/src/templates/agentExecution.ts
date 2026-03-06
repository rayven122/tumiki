/**
 * エージェント実行結果通知テンプレート
 *
 * エージェント実行完了時のSlack通知メッセージを生成
 */

import type { SlackBotMessage } from "../botClient.js";

export type AgentExecutionNotificationData = {
  /** エージェント名 */
  agentName: string;
  /** 実行成功/失敗 */
  success: boolean;
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** エラーメッセージ（失敗時のみ） */
  errorMessage?: string;
  /** 使用したツール名リスト */
  toolNames?: string[];
  /** 詳細ページへのURL */
  detailUrl?: string;
  /** 通知先チャンネルID */
  channelId: string;
};

/**
 * 実行時間をフォーマット
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}秒`;
};

/**
 * エージェント実行結果通知メッセージを生成
 */
export const makeAgentExecutionSlackMessage = (
  data: AgentExecutionNotificationData,
): SlackBotMessage => {
  const statusEmoji = data.success ? ":white_check_mark:" : ":x:";
  const statusText = data.success ? "成功" : "失敗";
  const headerText = `${statusEmoji} エージェント実行${statusText}: ${data.agentName}`;

  const blocks: SlackBotMessage["blocks"] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: headerText,
        emoji: true,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*ステータス*\n${statusText}`,
        },
        {
          type: "mrkdwn",
          text: `*実行時間*\n${formatDuration(data.durationMs)}`,
        },
      ],
    },
  ];

  // 失敗時はエラーメッセージを表示
  if (!data.success && data.errorMessage) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*エラー内容*\n\`\`\`${data.errorMessage}\`\`\``,
      },
    });
  }

  // 使用ツールを表示
  if (data.toolNames?.length) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*使用ツール*\n${data.toolNames.join(", ")}`,
        },
      },
    );
  }

  // 詳細リンク
  if (data.detailUrl) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${data.detailUrl}|:link: 詳細を確認>`,
        },
      ],
    });
  }

  return {
    channel: data.channelId,
    text: headerText,
    blocks,
  };
};
