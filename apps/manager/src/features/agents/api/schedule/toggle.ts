import type { PrismaClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { AgentScheduleId } from "@/schema/ids";
import type { ScheduleStatus } from "@tumiki/db/prisma";
import { buildAgentAccessCondition } from "../utils";

type ToggleScheduleParams = {
  id: AgentScheduleId;
  status: ScheduleStatus;
  organizationId: string;
  userId: string;
};

/**
 * スケジュールの有効/無効を切り替える
 */
export const toggleSchedule = async (
  db: PrismaClient,
  params: ToggleScheduleParams,
): Promise<{
  id: AgentScheduleId;
  agentId: string;
  cronExpression: string;
  timezone: string;
  status: ScheduleStatus;
}> => {
  const { id, status, organizationId, userId } = params;

  // スケジュールの存在確認とアクセス権限チェック
  const existingSchedule = await db.agentSchedule.findFirst({
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

  // ステータスを更新
  const schedule = await db.agentSchedule.update({
    where: { id },
    data: { status },
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
