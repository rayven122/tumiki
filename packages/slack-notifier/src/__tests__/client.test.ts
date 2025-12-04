import { describe, test, expect, beforeEach, vi } from "vitest";
import { sendSlackMessage } from "../client";
import type { SlackMessage } from "../types/index";

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

    const result = await sendSlackMessage(mockWebhookUrl, mockMessage);

    expect(result.success).toStrictEqual(true);
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

  test("API エラー時にエラーレスポンスを返す", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    } as Response);

    const result = await sendSlackMessage(mockWebhookUrl, mockMessage);

    expect(result.success).toStrictEqual(false);
    expect(result.error).toBeDefined();
  });

  test("ネットワークエラー時にエラーレスポンスを返す", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    const result = await sendSlackMessage(mockWebhookUrl, mockMessage);

    expect(result.success).toStrictEqual(false);
    expect(result.error).toStrictEqual("Network error");
  });
});
