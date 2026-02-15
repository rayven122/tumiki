export { sendSlackMessage, type SlackMessage } from "./client.js";

export {
  sendSlackBotMessage,
  listSlackChannels,
  type SlackBotMessage,
  type SlackBotClientConfig,
  type SlackChannel,
} from "./botClient.js";

export {
  makeFeedbackSlackMessage,
  type FeedbackNotificationData,
} from "./templates/feedback.js";

export {
  makeAgentExecutionSlackMessage,
  type AgentExecutionNotificationData,
} from "./templates/agentExecution.js";

// Slack Block Kit型定義を再エクスポート
export type { Block, KnownBlock } from "@slack/web-api";

// エラー関連
export {
  SlackApiError,
  isSlackApiError,
  getSlackErrorInfo,
  extractSlackErrorCode,
  SLACK_ERROR_MESSAGES,
} from "./errors.js";
