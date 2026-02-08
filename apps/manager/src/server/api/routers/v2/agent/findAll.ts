import type { PrismaTransactionClient } from "@tumiki/db";
import { McpServerVisibility } from "@tumiki/db";

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
    where: {
      OR: [
        // 同一組織内で作成者自身のエージェント
        {
          organizationId,
          createdById: userId,
        },
        // 同一組織内で ORGANIZATION 可視性のエージェント
        {
          organizationId,
          visibility: McpServerVisibility.ORGANIZATION,
        },
        // PUBLIC 可視性のエージェント（将来的に実装）
        // { visibility: McpServerVisibility.PUBLIC },
      ],
    },
    select: {
      id: true,
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
