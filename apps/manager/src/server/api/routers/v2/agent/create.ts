import type { PrismaTransactionClient } from "@tumiki/db";
import type { z } from "zod";
import type { AgentId } from "@/schema/ids";
import type { CreateAgentInputSchema } from "./index";

type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

/**
 * エージェントを作成する
 */
export const createAgent = async (
  tx: PrismaTransactionClient,
  input: CreateAgentInput,
  organizationId: string,
  userId: string,
): Promise<{ id: AgentId }> => {
  const agent = await tx.agent.create({
    data: {
      name: input.name,
      description: input.description,
      iconPath: input.iconPath,
      systemPrompt: input.systemPrompt,
      modelId: input.modelId,
      visibility: input.visibility,
      organizationId,
      createdById: userId,
      // MCPサーバーの紐付け
      mcpServers: input.mcpServerIds?.length
        ? {
            connect: input.mcpServerIds.map((id) => ({ id })),
          }
        : undefined,
    },
    select: {
      id: true,
    },
  });

  return { id: agent.id as AgentId };
};
