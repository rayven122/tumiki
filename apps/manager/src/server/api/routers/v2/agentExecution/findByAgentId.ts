import type { PrismaClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { AgentId } from "@/schema/ids";
import { buildAgentAccessCondition } from "../utils";

type FindByAgentIdParams = {
  agentId: AgentId;
  organizationId: string;
  userId: string;
  limit: number;
  cursor?: string;
};

export const findExecutionsByAgentId = async (
  db: PrismaClient,
  params: FindByAgentIdParams,
) => {
  const { agentId, organizationId, userId, limit, cursor } = params;

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

  const executions = await db.agentExecutionLog.findMany({
    where: {
      agentId,
      success: { not: null },
    },
    take: limit + 1,
    // カーソルが指定された場合、そのカーソルの次の要素から取得
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    select: {
      id: true,
      scheduleId: true,
      schedule: {
        select: {
          name: true,
        },
      },
      modelId: true,
      success: true,
      durationMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const hasNextPage = executions.length > limit;
  const items = hasNextPage ? executions.slice(0, limit) : executions;
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined;

  return {
    items: items.map((execution) => ({
      id: execution.id,
      scheduleId: execution.scheduleId,
      scheduleName: execution.schedule?.name ?? null,
      modelId: execution.modelId,
      success: execution.success!,
      durationMs: execution.durationMs,
      createdAt: execution.createdAt,
    })),
    nextCursor,
  };
};
