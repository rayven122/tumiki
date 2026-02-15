import type { Prisma } from "@tumiki/db/prisma";

/**
 * エージェント詳細取得用の共通selectオブジェクト
 * findByIdとfindBySlugで共通利用
 */
export const agentDetailSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  iconPath: true,
  systemPrompt: true,
  modelId: true,
  visibility: true,
  organizationId: true,
  // Slack通知設定
  enableSlackNotification: true,
  slackNotificationChannelId: true,
  slackNotificationChannelName: true,
  notifyOnlyOnFailure: true,
  createdById: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
  mcpServers: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconPath: true,
      serverStatus: true,
      // テンプレートのiconPathをフォールバックとして取得
      templateInstances: {
        select: {
          mcpServerTemplate: {
            select: {
              iconPath: true,
            },
          },
        },
        take: 1,
      },
    },
  },
  schedules: {
    select: {
      id: true,
      name: true,
      cronExpression: true,
      timezone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  executionLogs: {
    select: {
      id: true,
      scheduleId: true,
      success: true,
      durationMs: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10, // 最新10件のみ
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentSelect;
