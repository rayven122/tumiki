import type { PrismaTransactionClient } from "@tumiki/db";
import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { AgentScheduleId } from "@/schema/ids";
import type { CreateScheduleInputSchema } from "./router";
import { buildAgentAccessCondition } from "@/server/api/routers/v2/utils";

type CreateScheduleInput = z.infer<typeof CreateScheduleInputSchema>;

type CreateScheduleParams = CreateScheduleInput & {
  organizationId: string;
  userId: string;
};

/**
 * スケジュールを作成する
 */
export const createSchedule = async (
  tx: PrismaTransactionClient,
  params: CreateScheduleParams,
): Promise<{
  id: AgentScheduleId;
  agentId: string;
  cronExpression: string;
  timezone: string;
  status: "ACTIVE" | "PAUSED" | "DISABLED";
}> => {
  const { agentId, name, cronExpression, timezone, organizationId, userId } =
    params;

  // エージェントの存在確認とアクセス権限チェック
  const agent = await tx.agent.findFirst({
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

  // スケジュールを作成
  const schedule = await tx.agentSchedule.create({
    data: {
      agentId,
      name,
      cronExpression,
      timezone,
      status: "ACTIVE",
    },
    select: {
      id: true,
      agentId: true,
      cronExpression: true,
      timezone: true,
      status: true,
    },
  });

  return {
    id: schedule.id as AgentScheduleId,
    agentId: schedule.agentId,
    cronExpression: schedule.cronExpression,
    timezone: schedule.timezone,
    status: schedule.status,
  };
};
