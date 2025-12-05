import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SlackMessage } from "../client";
import { sendSlackMessage } from "../client";

describe("sendSlackMessage", () => {
  const mockWebhookUrl = "https://hooks.slack.com/services/TEST/WEBHOOK/URL";
  const mockMessage: SlackMessage = {
    text: "Test message",
    blocks: [],
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test("正常にメッセージを送信できる", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await expect(
      sendSlackMessage(mockWebhookUrl, mockMessage),
    ).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockMessage),
      }),
    );
  });

  test("API エラー時に例外をスローする", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    } as Response);

    await expect(sendSlackMessage(mockWebhookUrl, mockMessage)).rejects.toThrow(
      "Slack API error: 400 Bad Request",
    );
  });

  test("ネットワークエラー時に例外をスローする", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(sendSlackMessage(mockWebhookUrl, mockMessage)).rejects.toThrow(
      "Network error",
    );
  });
});
