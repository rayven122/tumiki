/**
 * Slack通知送信ロジック
 *
 * エージェント実行完了時にSlack通知を送信する
 */

import {
  sendSlackBotMessage,
  makeAgentExecutionSlackMessage,
} from "@tumiki/slack";
import { logError, logInfo } from "../../shared/logger/index.js";
import { toError } from "../../shared/errors/toError.js";
import {
  getAgentNotificationConfig,
  getOrganizationSlackConfig as getOrgSlackConfigFromDb,
  type AgentNotificationConfig,
} from "../../infrastructure/db/repositories/index.js";
import { decrypt } from "../../infrastructure/crypto/index.js";

export type AgentExecutionNotifyParams = {
  agentId: string;
  agentName: string;
  organizationId: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  toolNames?: string[];
  chatId?: string;
};

type DecryptedSlackConfig = {
  slackBotToken: string | null;
};

const DEFAULT_MANAGER_BASE_URL = "https://app.tumiki.io";

/**
 * 詳細ページURLを構築
 */
const buildDetailUrl = (chatId?: string): string | undefined => {
  if (!chatId) return undefined;
  const baseUrl = process.env.MANAGER_BASE_URL ?? DEFAULT_MANAGER_BASE_URL;
  return `${baseUrl}/agents/executions/${chatId}`;
};

/**
 * 組織のSlack Bot Token を取得・復号化
 *
 * データベースから暗号化されたトークンを取得し、復号化して返す
 */
const getDecryptedSlackConfig = async (
  organizationId: string,
): Promise<DecryptedSlackConfig> => {
  const orgConfig = await getOrgSlackConfigFromDb(organizationId);

  if (!orgConfig?.slackBotToken) {
    return { slackBotToken: null };
  }

  // 暗号化されたトークンを復号化
  const decryptedToken = decrypt(orgConfig.slackBotToken);

  return { slackBotToken: decryptedToken };
};

/**
 * 通知を送信すべきかどうかを判定
 */
const shouldNotify = (
  config: AgentNotificationConfig,
  success: boolean,
): boolean => {
  // 通知が無効、またはチャンネル未設定の場合は通知しない
  if (!config.enableSlackNotification || !config.slackNotificationChannelId) {
    return false;
  }

  // 失敗時のみ通知する設定で、成功した場合は通知しない
  if (config.notifyOnlyOnFailure && success) {
    return false;
  }

  return true;
};

/**
 * エージェント実行完了時にSlack通知を送信
 */
export const notifyAgentExecution = async (
  params: AgentExecutionNotifyParams,
): Promise<void> => {
  try {
    // エージェントの通知設定を取得
    const agentConfig = await getAgentNotificationConfig(params.agentId);
    if (!agentConfig) {
      logInfo("Agent not found for notification", { agentId: params.agentId });
      return;
    }

    // 通知すべきかどうかを判定
    if (!shouldNotify(agentConfig, params.success)) {
      logInfo("Notification skipped based on config", {
        agentId: params.agentId,
        enableSlackNotification: agentConfig.enableSlackNotification,
        notifyOnlyOnFailure: agentConfig.notifyOnlyOnFailure,
        success: params.success,
      });
      return;
    }

    // 組織のSlack設定を取得・復号化
    const orgConfig = await getDecryptedSlackConfig(params.organizationId);
    if (!orgConfig.slackBotToken) {
      logInfo("Slack bot token not configured", {
        organizationId: params.organizationId,
      });
      return;
    }

    // 詳細ページURLを構築
    const detailUrl = buildDetailUrl(params.chatId);

    // 通知メッセージを生成
    const message = makeAgentExecutionSlackMessage({
      agentName: params.agentName,
      success: params.success,
      durationMs: params.durationMs,
      errorMessage: params.errorMessage,
      toolNames: params.toolNames,
      detailUrl,
      channelId: agentConfig.slackNotificationChannelId!,
    });

    // Slack通知を送信
    await sendSlackBotMessage({ botToken: orgConfig.slackBotToken }, message);

    logInfo("Slack notification sent successfully", {
      agentId: params.agentId,
      success: params.success,
      channelId: agentConfig.slackNotificationChannelId,
    });
  } catch (error) {
    // 通知失敗は致命的エラーではないため、警告ログのみ
    logError("Failed to send Slack notification", toError(error), {
      agentId: params.agentId,
      organizationId: params.organizationId,
    });
  }
};
