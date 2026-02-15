import type { PrismaTransactionClient } from "@tumiki/db";
import { buildAgentAccessCondition } from "./utils";

type FindAllAgentsParams = {
  organizationId: string;
  userId: string;
};

/**
 * エージェント一覧を取得する
 * - PRIVATE: 作成者のみ
 * - ORGANIZATION: 同一組織内
 * - PUBLIC: 全ユーザー（将来的に実装）
 */
export const findAllAgents = async (
  db: PrismaTransactionClient,
  params: FindAllAgentsParams,
) => {
  const { organizationId, userId } = params;

  const agents = await db.agent.findMany({
    where: buildAgentAccessCondition(organizationId, userId),
    select: {
      id: true,
      slug: true,
      organizationId: true,
      name: true,
      description: true,
      iconPath: true,
      systemPrompt: true,
      modelId: true,
      visibility: true,
      estimatedDurationMs: true,
      // Slack通知設定
      enableSlackNotification: true,
      slackNotificationChannelId: true,
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
          iconPath: true,
          // テンプレートのiconPathとツール数を取得
          templateInstances: {
            select: {
              mcpServerTemplate: {
                select: {
                  iconPath: true,
                  _count: {
                    select: {
                      mcpTools: true,
                    },
                  },
                },
              },
            },
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
        },
      },
      _count: {
        select: {
          executionLogs: true,
        },
      },
      executionLogs: {
        select: {
          id: true,
          success: true,
          durationMs: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        // 成功率計算のため、最新20件を取得
        take: 20,
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return agents;
};
