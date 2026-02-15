// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * エージェント実行通知サービス（EE エントリーポイント）
 *
 * エージェント実行完了時のSlack通知を送信
 */

export type { AgentExecutionNotifyParams } from "./slackNotifier.ee.js";
export { notifyAgentExecution } from "./slackNotifier.ee.js";
