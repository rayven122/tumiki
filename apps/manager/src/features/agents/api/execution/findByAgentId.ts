import type { PrismaClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { AgentId } from "@/schema/ids";
import { buildAgentAccessCondition } from "@/server/api/routers/v2/utils";

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

  // 実行履歴を取得（次ページ確認用に1件多く取得）
  // success が null でないもの（完了済み）のみ取得
  const executions = await db.agentExecutionLog.findMany({
    where: {
      agentId,
      success: { not: null },
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      scheduleId: true,
      chatId: true,
      schedule: { select: { name: true } },
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
      chatId: execution.chatId,
      scheduleName: execution.schedule?.name ?? null,
      modelId: execution.modelId,
      success: execution.success!,
      durationMs: execution.durationMs,
      createdAt: execution.createdAt,
    })),
    nextCursor,
  };
};
