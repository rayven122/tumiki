export { sendSlackMessage, type SlackMessage } from "./client.js";

export {
  createFeedbackNotification,
  type FeedbackNotificationData,
} from "./templates/feedback.js";

// Slack Block Kit型定義を再エクスポート
export type { Block, KnownBlock } from "@slack/web-api";
