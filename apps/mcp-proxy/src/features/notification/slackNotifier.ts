/**
 * Slack通知送信ロジック
 *
 * エージェント実行完了時にSlack通知を送信する
 */

import {
  sendSlackBotMessage,
  makeAgentExecutionSlackMessage,
  isSlackApiError,
} from "@tumiki/slack";
import { logError, logInfo, logWarn } from "../../shared/logger/index.js";
import { toError } from "../../shared/errors/toError.js";
import {
  getAgentNotificationConfig,
  getOrganizationSlackConfig as getOrgSlackConfigFromDb,
  type AgentNotificationConfig,
} from "../../infrastructure/db/repositories/index.js";

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

/** Slack通知の結果 */
export type SlackNotificationResult = {
  /** 通知を試みたか */
  attempted: boolean;
  /** 成功したか */
  success: boolean;
  /** エラーコード（失敗時） */
  errorCode?: string;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
  /** ユーザーが取るべきアクション（失敗時） */
  userAction?: string;
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
 * 組織のSlack Bot Token を取得
 *
 * データベースからトークンを取得（prisma-field-encryptionで自動復号化）
 */
const getSlackConfig = async (
  organizationId: string,
): Promise<DecryptedSlackConfig> => {
  const orgConfig = await getOrgSlackConfigFromDb(organizationId);
  return { slackBotToken: orgConfig?.slackBotToken ?? null };
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

/** 通知を試みなかった場合の結果 */
const NOT_ATTEMPTED: SlackNotificationResult = {
  attempted: false,
  success: false,
};

/**
 * エージェント実行完了時にSlack通知を送信
 *
 * @returns 通知結果（試みたか、成功したか、エラー情報）
 */
export const notifyAgentExecution = async (
  params: AgentExecutionNotifyParams,
): Promise<SlackNotificationResult> => {
  // catchブロックでも参照できるようにチャンネルIDを保持
  let notificationChannelId: string | undefined;

  try {
    // エージェントの通知設定を取得
    const agentConfig = await getAgentNotificationConfig(params.agentId);
    if (!agentConfig) {
      logInfo("Agent not found for notification", { agentId: params.agentId });
      return NOT_ATTEMPTED;
    }

    // 通知すべきかどうかを判定
    if (!shouldNotify(agentConfig, params.success)) {
      logInfo("Notification skipped based on config", {
        agentId: params.agentId,
        enableSlackNotification: agentConfig.enableSlackNotification,
        notifyOnlyOnFailure: agentConfig.notifyOnlyOnFailure,
        success: params.success,
      });
      return NOT_ATTEMPTED;
    }

    // チャンネルIDを保持（エラー時のログ用）
    notificationChannelId = agentConfig.slackNotificationChannelId ?? undefined;

    // 組織のSlack設定を取得（prisma-field-encryptionで自動復号化）
    const orgConfig = await getSlackConfig(params.organizationId);
    if (!orgConfig.slackBotToken) {
      logInfo("Slack bot token not configured", {
        organizationId: params.organizationId,
      });
      return NOT_ATTEMPTED;
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

    return { attempted: true, success: true };
  } catch (error) {
    // Slack APIエラーの場合はユーザーフレンドリーなメッセージを返す
    if (isSlackApiError(error)) {
      logWarn("Slack notification failed - user action required", {
        agentId: params.agentId,
        organizationId: params.organizationId,
        errorCode: error.code,
        userMessage: error.userMessage,
        userAction: error.userAction,
        channelId: notificationChannelId,
      });
      return {
        attempted: true,
        success: false,
        errorCode: error.code,
        errorMessage: error.userMessage,
        userAction: error.userAction,
      };
    }

    // その他のエラー（ネットワークエラーなど）
    const err = toError(error);
    logError("Failed to send Slack notification", err, {
      agentId: params.agentId,
      organizationId: params.organizationId,
    });
    return {
      attempted: true,
      success: false,
      errorCode: "unknown",
      errorMessage: err.message,
    };
  }
};
