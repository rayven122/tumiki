/**
 * Slack Bot Token API クライアント
 *
 * Bot Tokenを使用してSlack Web APIを呼び出す
 * OAuth連携で取得したBot Tokenを使用してメッセージを送信
 */

import type { Block, KnownBlock } from "@slack/web-api";

export type SlackBotMessage = {
  channel: string;
  text: string;
  blocks?: (Block | KnownBlock)[];
};

export type SlackBotClientConfig = {
  botToken: string;
};

/**
 * Slack Bot Token APIを使用してメッセージを送信
 *
 * @throws {Error} Slack APIエラーまたはネットワークエラー
 */
export const sendSlackBotMessage = async (
  config: SlackBotClientConfig,
  message: SlackBotMessage,
): Promise<{ ok: boolean; ts?: string }> => {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.botToken}`,
    },
    body: JSON.stringify({
      channel: message.channel,
      text: message.text,
      blocks: message.blocks,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack API HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
    ts?: string;
  };

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown error"}`);
  }

  return { ok: true, ts: data.ts };
};
