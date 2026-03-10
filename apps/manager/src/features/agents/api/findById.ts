import type { PrismaTransactionClient } from "@tumiki/db";
import type { AgentId } from "@/schema/ids";
import { TRPCError } from "@trpc/server";
import { buildAgentAccessCondition, agentDetailSelect } from "./utils";

type FindByIdParams = {
  id: AgentId;
  organizationId: string;
  userId: string;
};

/**
 * エージェント詳細を取得する
 */
export const findAgentById = async (
  db: PrismaTransactionClient,
  params: FindByIdParams,
) => {
  const { id, organizationId, userId } = params;

  const agent = await db.agent.findFirst({
    where: {
      id,
      ...buildAgentAccessCondition(organizationId, userId),
    },
    select: agentDetailSelect,
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  return agent;
};
