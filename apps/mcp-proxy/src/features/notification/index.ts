/**
 * エージェント実行通知サービス
 *
 * エージェント実行完了時のSlack通知機能を提供
 */

export type {
  AgentExecutionNotifyParams,
  SlackNotificationResult,
} from "./slackNotifier.js";
export { notifyAgentExecution } from "./slackNotifier.js";
