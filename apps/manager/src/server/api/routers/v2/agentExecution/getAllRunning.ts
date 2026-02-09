import type { PrismaClient } from "@tumiki/db";
import { buildAgentAccessCondition } from "../utils";

type GetAllRunningParams = {
  organizationId: string;
  userId: string;
};

/**
 * 全エージェントの稼働中実行を取得（進捗計算用データ含む）
 * success: null のレコードは実行中を表す
 */
export const getAllRunningExecutions = async (
  db: PrismaClient,
  params: GetAllRunningParams,
) => {
  const { organizationId, userId } = params;

  const runningExecutions = await db.agentExecutionLog.findMany({
    where: {
      success: null,
      agent: buildAgentAccessCondition(organizationId, userId),
    },
    select: {
      id: true,
      agentId: true,
      scheduleId: true,
      schedule: { select: { name: true } },
      agent: {
        select: {
          name: true,
          iconPath: true,
          estimatedDurationMs: true,
        },
      },
      modelId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return runningExecutions.map(({ schedule, agent, ...rest }) => ({
    ...rest,
    scheduleName: schedule?.name ?? null,
    agentName: agent.name,
    agentIconPath: agent.iconPath,
    estimatedDurationMs: agent.estimatedDurationMs,
  }));
};
