/**
 * Slack連携API
 *
 * EE版ではSlack連携機能を提供
 * 将来的にはビルド設定に応じて切り替え
 */

// EE機能として実装（将来的にはビルド時に切り替え）
export { slackIntegrationRouter } from "./router.ee";
