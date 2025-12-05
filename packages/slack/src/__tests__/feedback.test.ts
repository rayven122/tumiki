import { describe, expect, test } from "vitest";

import type { FeedbackNotificationData } from "../templates/feedback";
import { createFeedbackNotification } from "../templates/feedback";

describe("createFeedbackNotification", () => {
  const baseData: FeedbackNotificationData = {
    feedbackId: "test-feedback-id",
    type: "INQUIRY",
    subject: "Test Subject",
    content: "Test Content",
    userName: "Test User",
    userEmail: "test@example.com",
    organizationName: "Test Org",
  };

  test("お問い合わせ通知を正しく生成する", () => {
    const notification = createFeedbackNotification(baseData);

    expect(notification.text).toContain("お問い合わせ");
    expect(notification.blocks).toBeDefined();
    expect(Array.isArray(notification.blocks)).toBe(true);
    expect(notification.blocks!.length).toBeGreaterThan(0);
  });

  test("機能要望通知を正しく生成する", () => {
    const notification = createFeedbackNotification({
      ...baseData,
      type: "FEATURE_REQUEST",
    });

    expect(notification.text).toContain("機能要望");
    expect(notification.blocks).toBeDefined();
  });

  test("長い内容を切り詰める", () => {
    const longContent = "a".repeat(5000);
    const notification = createFeedbackNotification({
      ...baseData,
      content: longContent,
    });

    // 内容ブロックを探す（2番目のsectionブロック、インデックス3）
    const blocks = notification.blocks;
    expect(blocks).toBeDefined();
    expect(blocks!.length).toBeGreaterThan(3);

    const contentBlock = blocks![3];
    expect(contentBlock).toBeDefined();
    expect(contentBlock!.type).toBe("section");

    if (
      contentBlock &&
      "text" in contentBlock &&
      contentBlock.text &&
      typeof contentBlock.text === "object" &&
      "text" in contentBlock.text
    ) {
      const textContent = contentBlock.text.text;
      // Slack Block Kitの制限3000文字を超えないことを確認
      expect(textContent.length).toBeLessThanOrEqual(3000);
      // 切り詰めメッセージが含まれていることを確認
      expect(textContent).toContain("（内容が長いため省略されました）");
    }
  });
});
