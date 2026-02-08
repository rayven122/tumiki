import type { PrismaTransactionClient } from "@tumiki/db";
import { McpServerVisibility } from "@tumiki/db";
import type { AgentId } from "@/schema/ids";
import { TRPCError } from "@trpc/server";

type FindByIdParams = {
  id: AgentId;
  organizationId: string;
  userId: string;
};

/**
 * エージェント詳細を取得する
 */
export const findAgentById = async (
  db: PrismaTransactionClient,
  params: FindByIdParams,
) => {
  const { id, organizationId, userId } = params;

  const agent = await db.agent.findFirst({
    where: {
      id,
      OR: [
        // 同一組織内で作成者自身
        {
          organizationId,
          createdById: userId,
        },
        // 同一組織内で ORGANIZATION 可視性
        {
          organizationId,
          visibility: McpServerVisibility.ORGANIZATION,
        },
        // PUBLIC 可視性（将来的に実装）
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
      organizationId: true,
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
          description: true,
          iconPath: true,
          serverStatus: true,
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
    },
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  return agent;
};
