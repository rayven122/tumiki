/**
 * Slack連携機能（EE機能）
 *
 * Slack OAuth連携とエージェント実行通知を提供
 *
 * 注意: slackIntegrationRouterはサーバー専用のため、
 * クライアントコンポーネントからはインポートできません。
 * サーバーサイドでは直接 ./api からインポートしてください。
 */

export { SlackConnectionSection } from "./_components";
