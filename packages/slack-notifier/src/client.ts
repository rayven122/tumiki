import type { SlackMessage, SlackResponse } from "./types/index.js";

/**
 * Slack Webhook経由でメッセージを送信
 */
export const sendSlackMessage = async (
  webhookUrl: string,
  message: SlackMessage,
): Promise<SlackResponse> => {
  try {
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

    return {
      success: true,
    };
  } catch (error) {
    console.error("Slack notification failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
