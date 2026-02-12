import type { PrismaClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { AgentId } from "@/schema/ids";
import { buildAgentAccessCondition } from "@/server/api/routers/v2/utils";

type FindByAgentIdParams = {
  agentId: AgentId;
  organizationId: string;
  userId: string;
};

/**
 * エージェントのスケジュール一覧を取得する
 */
export const findSchedulesByAgentId = async (
  db: PrismaClient,
  params: FindByAgentIdParams,
) => {
  const { agentId, organizationId, userId } = params;

  // エージェントの存在確認とアクセス権限チェック
  const agent = await db.agent.findFirst({
    where: {
      id: agentId,
      ...buildAgentAccessCondition(organizationId, userId),
    },
    select: { id: true },
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  // スケジュール一覧を取得
  const schedules = await db.agentSchedule.findMany({
    where: { agentId },
    select: {
      id: true,
      name: true,
      cronExpression: true,
      timezone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          executionLogs: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return schedules;
};
