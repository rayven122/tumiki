import { describe, test, expect } from "vitest";
import { createFeedbackNotification } from "../templates/feedback";
import type { FeedbackNotificationData } from "../templates/feedback";

describe("createFeedbackNotification", () => {
  const baseData: FeedbackNotificationData = {
    type: "INQUIRY",
    subject: "Test Subject",
    content: "Test Content",
    userName: "Test User",
    userEmail: "test@example.com",
    organizationName: "Test Org",
    feedbackUrl: "https://example.com/feedback/123",
  };

  test("お問い合わせ通知を正しく生成する", () => {
    const notification = createFeedbackNotification(baseData);

    expect(notification.text).toContain("お問い合わせ");
    expect(notification.blocks).toBeDefined();
    expect(notification.blocks?.length).toBeGreaterThan(0);
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
    const longContent = "a".repeat(3000);
    const notification = createFeedbackNotification({
      ...baseData,
      content: longContent,
    });

    const contentBlock = notification.blocks?.find(
      (block) =>
        block.type === "section" &&
        typeof block.text === "object" &&
        block.text !== null &&
        "text" in block.text,
    );

    expect(contentBlock).toBeDefined();
    if (
      contentBlock &&
      typeof contentBlock.text === "object" &&
      contentBlock.text !== null &&
      "text" in contentBlock.text &&
      typeof contentBlock.text.text === "string"
    ) {
      expect(contentBlock.text.text.length).toBeLessThanOrEqual(2010); // 2000 + "..."
    }
  });
});
