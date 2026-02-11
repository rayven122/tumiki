import type { PrismaTransactionClient } from "@tumiki/db";
import type { AgentId } from "@/schema/ids";
import { TRPCError } from "@trpc/server";

type DeleteAgentParams = {
  id: AgentId;
  organizationId: string;
};

/**
 * エージェントを削除する
 */
export const deleteAgent = async (
  tx: PrismaTransactionClient,
  params: DeleteAgentParams,
): Promise<{ id: AgentId; name: string }> => {
  const { id, organizationId } = params;

  // エージェントの存在確認
  const existingAgent = await tx.agent.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existingAgent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  // 削除（Cascade で AgentSchedule, AgentExecutionLog も削除される）
  await tx.agent.delete({
    where: {
      id,
    },
  });

  return { id: existingAgent.id as AgentId, name: existingAgent.name };
};
