import type { Block, KnownBlock } from "@slack/web-api";

export type SlackMessage = {
  text: string;
  blocks?: (Block | KnownBlock)[];
};

/**
 * Slack Webhook経由でメッセージを送信
 *
 * @throws {Error} Slack APIエラーまたはネットワークエラー
 */
export const sendSlackMessage = async (
  webhookUrl: string,
  message: SlackMessage,
): Promise<void> => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack API error: ${response.status} ${errorText}`);
  }
};
