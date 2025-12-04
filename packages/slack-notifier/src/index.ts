export { sendSlackMessage } from "./client.js";

export type {
  SlackMessage,
  SlackResponse,
  SlackBlock,
} from "./types/index.js";

export {
  createFeedbackNotification,
  type FeedbackNotificationData,
} from "./templates/feedback.js";
