import type { PrismaTransactionClient } from "@tumiki/db";
import { buildAgentAccessCondition } from "../utils";

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
          name: true,
          iconPath: true,
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
          status: true,
        },
      },
      _count: {
        select: {
          executionLogs: true,
        },
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
