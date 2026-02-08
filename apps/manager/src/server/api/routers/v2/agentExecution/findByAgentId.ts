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

/**
 * エージェントの実行履歴を取得する
 */
export const findExecutionsByAgentId = async (
  db: PrismaClient,
  params: FindByAgentIdParams,
) => {
  const { agentId, organizationId, userId, limit, cursor } = params;

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

  // 実行履歴を取得
  const executions = await db.agentExecutionLog.findMany({
    where: { agentId },
    take: limit + 1, // 次ページがあるかチェック用に1件多く取得
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // カーソル自体はスキップ
    }),
    select: {
      id: true,
      scheduleId: true,
      schedule: {
        select: {
          name: true,
        },
      },
      success: true,
      durationMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 次ページがあるかチェック
  const hasNextPage = executions.length > limit;
  const items = hasNextPage ? executions.slice(0, limit) : executions;
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined;

  return {
    items: items.map((execution) => ({
      id: execution.id,
      scheduleId: execution.scheduleId,
      scheduleName: execution.schedule?.name ?? null,
      success: execution.success,
      durationMs: execution.durationMs,
      createdAt: execution.createdAt,
    })),
    nextCursor,
  };
};
