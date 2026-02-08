import type { PrismaTransactionClient } from "@tumiki/db";
import type { z } from "zod";
import type { AgentId } from "@/schema/ids";
import type { UpdateAgentInputSchema } from "./index";
import { TRPCError } from "@trpc/server";

type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

/**
 * エージェントを更新する
 */
export const updateAgent = async (
  tx: PrismaTransactionClient,
  input: UpdateAgentInput,
  organizationId: string,
): Promise<{ id: AgentId }> => {
  // エージェントの存在確認
  const existingAgent = await tx.agent.findFirst({
    where: {
      id: input.id,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existingAgent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  // MCPサーバーの更新（set で完全置換）
  const mcpServersUpdate = input.mcpServerIds
    ? {
        set: input.mcpServerIds.map((id) => ({ id })),
      }
    : undefined;

  const agent = await tx.agent.update({
    where: {
      id: input.id,
    },
    data: {
      name: input.name,
      description: input.description,
      iconPath: input.iconPath,
      systemPrompt: input.systemPrompt,
      modelId: input.modelId,
      visibility: input.visibility,
      mcpServers: mcpServersUpdate,
    },
    select: {
      id: true,
    },
  });

  return { id: agent.id as AgentId };
};
