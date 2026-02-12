import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { AgentScheduleId } from "@/schema/ids";
import { buildAgentAccessCondition } from "@/server/api/routers/v2/utils";

type DeleteScheduleParams = {
  id: AgentScheduleId;
  organizationId: string;
  userId: string;
};

/**
 * スケジュールを削除する
 */
export const deleteSchedule = async (
  tx: PrismaTransactionClient,
  params: DeleteScheduleParams,
): Promise<{ id: AgentScheduleId; name: string }> => {
  const { id, organizationId, userId } = params;

  // スケジュールの存在確認とアクセス権限チェック
  const existingSchedule = await tx.agentSchedule.findFirst({
    where: {
      id,
      agent: buildAgentAccessCondition(organizationId, userId),
    },
    select: { id: true, name: true },
  });

  if (!existingSchedule) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "スケジュールが見つかりません",
    });
  }

  // スケジュールを削除
  await tx.agentSchedule.delete({
    where: { id },
  });

  return {
    id: existingSchedule.id as AgentScheduleId,
    name: existingSchedule.name,
  };
};
