import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SlackBotMessage } from "../botClient.js";
import { sendSlackBotMessage } from "../botClient.js";

describe("sendSlackBotMessage", () => {
  const mockBotToken = "xoxb-test-bot-token-12345";
  const mockMessage: SlackBotMessage = {
    channel: "C1234567890",
    text: "テストメッセージ",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*テスト* メッセージ",
        },
      },
    ],
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test("正常にメッセージを送信できる", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ts: "1234567890.123456" }),
    } as Response);

    const result = await sendSlackBotMessage(
      { botToken: mockBotToken },
      mockMessage,
    );

    expect(result).toStrictEqual({ ok: true, ts: "1234567890.123456" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://slack.com/api/chat.postMessage",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockBotToken}`,
        },
        body: JSON.stringify({
          channel: mockMessage.channel,
          text: mockMessage.text,
          blocks: mockMessage.blocks,
        }),
      }),
    );
  });

  test("blocksなしでメッセージを送信できる", async () => {
    const messageWithoutBlocks: SlackBotMessage = {
      channel: "C1234567890",
      text: "シンプルなメッセージ",
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ts: "1234567890.123457" }),
    } as Response);

    const result = await sendSlackBotMessage(
      { botToken: mockBotToken },
      messageWithoutBlocks,
    );

    expect(result).toStrictEqual({ ok: true, ts: "1234567890.123457" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://slack.com/api/chat.postMessage",
      expect.objectContaining({
        body: JSON.stringify({
          channel: messageWithoutBlocks.channel,
          text: messageWithoutBlocks.text,
          blocks: undefined,
        }),
      }),
    );
  });

  test("HTTPエラー時に例外をスローする", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(
      sendSlackBotMessage({ botToken: mockBotToken }, mockMessage),
    ).rejects.toThrow("Slack API HTTP error: 500");
  });

  test("Slack APIエラー時に例外をスローする", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: "channel_not_found" }),
    } as Response);

    await expect(
      sendSlackBotMessage({ botToken: mockBotToken }, mockMessage),
    ).rejects.toThrow("Slack API error: channel_not_found");
  });

  test("Slack APIエラーでerrorフィールドがない場合はunknown errorを返す", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false }),
    } as Response);

    await expect(
      sendSlackBotMessage({ botToken: mockBotToken }, mockMessage),
    ).rejects.toThrow("Slack API error: unknown error");
  });

  test("ネットワークエラー時に例外をスローする", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    await expect(
      sendSlackBotMessage({ botToken: mockBotToken }, mockMessage),
    ).rejects.toThrow("Network error");
  });
});
