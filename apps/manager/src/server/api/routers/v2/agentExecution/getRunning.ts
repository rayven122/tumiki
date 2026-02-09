import type { PrismaClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { AgentId } from "@/schema/ids";
import { buildAgentAccessCondition } from "../utils";

type GetRunningParams = {
  agentId: AgentId;
  organizationId: string;
  userId: string;
};

export const getRunningExecutions = async (
  db: PrismaClient,
  params: GetRunningParams,
) => {
  const { agentId, organizationId, userId } = params;

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

  const runningExecutions = await db.agentExecutionLog.findMany({
    where: {
      agentId,
      success: null,
    },
    select: {
      id: true,
      scheduleId: true,
      schedule: {
        select: {
          name: true,
        },
      },
      modelId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return runningExecutions.map((execution) => ({
    id: execution.id,
    scheduleId: execution.scheduleId,
    scheduleName: execution.schedule?.name ?? null,
    modelId: execution.modelId,
    createdAt: execution.createdAt,
  }));
};
