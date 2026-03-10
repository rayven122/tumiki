import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { buildAgentAccessCondition, agentDetailSelect } from "./utils";

type FindBySlugParams = {
  slug: string;
  organizationId: string;
  userId: string;
};

/**
 * スラグを使ってエージェント詳細を取得する
 */
export const findAgentBySlug = async (
  db: PrismaTransactionClient,
  params: FindBySlugParams,
) => {
  const { slug, organizationId, userId } = params;

  const agent = await db.agent.findFirst({
    where: {
      slug,
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
