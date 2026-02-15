/**
 * エージェントリポジトリ
 *
 * エージェント関連のDBクエリを提供。
 */

import { db } from "@tumiki/db/server";

/** エージェント情報（実行用） */
export type AgentForExecution = {
  id: string;
  name: string;
  organizationId: string;
  systemPrompt: string | null;
  modelId: string | null;
  createdById: string | null;
  mcpServers: Array<{ id: string }>;
};

/**
 * エージェントIDからエージェント情報を取得（実行用）
 *
 * @param agentId - エージェントID
 * @returns エージェント情報（見つからない場合はnull）
 */
export const findAgentForExecution = async (
  agentId: string,
): Promise<AgentForExecution | null> => {
  return db.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      systemPrompt: true,
      modelId: true,
      createdById: true,
      mcpServers: { select: { id: true } },
    },
  });
};

/**
 * エージェントの推定実行時間を更新
 *
 * @param agentId - エージェントID
 * @param estimatedDurationMs - 推定実行時間（ミリ秒）
 */
export const updateAgentEstimatedDuration = async (
  agentId: string,
  estimatedDurationMs: number,
): Promise<void> => {
  await db.agent.update({
    where: { id: agentId },
    data: { estimatedDurationMs },
  });
};

/** エージェント通知設定 */
export type AgentNotificationConfig = {
  enableSlackNotification: boolean;
  slackNotificationChannelId: string | null;
  slackNotificationChannelName: string | null;
  notifyOnlyOnFailure: boolean;
};

/**
 * エージェントIDから通知設定を取得
 *
 * @param agentId - エージェントID
 * @returns 通知設定（見つからない場合はnull）
 */
export const getAgentNotificationConfig = async (
  agentId: string,
): Promise<AgentNotificationConfig | null> => {
  return db.agent.findUnique({
    where: { id: agentId },
    select: {
      enableSlackNotification: true,
      slackNotificationChannelId: true,
      slackNotificationChannelName: true,
      notifyOnlyOnFailure: true,
    },
  });
};
