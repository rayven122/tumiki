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

export type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
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

/**
 * Slack APIレスポンスの型定義
 */
type SlackChannelResponse = {
  id: string;
  name: string;
  is_private: boolean;
};

type SlackConversationsListResponse = {
  ok: boolean;
  error?: string;
  channels?: SlackChannelResponse[];
  response_metadata?: {
    next_cursor?: string;
  };
};

/**
 * Botがアクセス可能なチャンネル一覧を取得
 *
 * @throws {Error} Slack APIエラーまたはネットワークエラー
 */
export const listSlackChannels = async (
  config: SlackBotClientConfig,
): Promise<SlackChannel[]> => {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
    });
    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.botToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Slack API HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as SlackConversationsListResponse;

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error ?? "unknown error"}`);
    }

    if (data.channels) {
      for (const ch of data.channels) {
        channels.push({
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private,
        });
      }
    }

    cursor = data.response_metadata?.next_cursor;
  } while (cursor);

  return channels;
};
