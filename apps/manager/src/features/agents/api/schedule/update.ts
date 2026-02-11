import type { PrismaTransactionClient } from "@tumiki/db";
import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { AgentScheduleId } from "@/schema/ids";
import type { UpdateScheduleInputSchema } from "./router";
import { buildAgentAccessCondition } from "@/server/api/routers/v2/utils";

type UpdateScheduleInput = z.infer<typeof UpdateScheduleInputSchema>;

type UpdateScheduleParams = UpdateScheduleInput & {
  organizationId: string;
  userId: string;
};

/**
 * スケジュールを更新する
 */
export const updateSchedule = async (
  tx: PrismaTransactionClient,
  params: UpdateScheduleParams,
): Promise<{
  id: AgentScheduleId;
  agentId: string;
  cronExpression: string;
  timezone: string;
  status: "ACTIVE" | "PAUSED" | "DISABLED";
}> => {
  const { id, name, cronExpression, timezone, organizationId, userId } = params;

  // スケジュールの存在確認とアクセス権限チェック
  const existingSchedule = await tx.agentSchedule.findFirst({
    where: {
      id,
      agent: buildAgentAccessCondition(organizationId, userId),
    },
    select: { id: true },
  });

  if (!existingSchedule) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "スケジュールが見つかりません",
    });
  }

  // スケジュールを更新
  const schedule = await tx.agentSchedule.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(cronExpression !== undefined && { cronExpression }),
      ...(timezone !== undefined && { timezone }),
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
