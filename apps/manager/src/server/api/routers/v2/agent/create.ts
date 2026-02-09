import type { PrismaTransactionClient } from "@tumiki/db";
import type { z } from "zod";
import type { AgentId } from "@/schema/ids";
import type { CreateAgentInputSchema } from "./index";
import { createManyNotifications } from "../notification/createNotification";

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
      name: true,
    },
  });

  // 組織の全メンバーに通知を作成（作成者自身を除く）
  const orgMembers = await tx.organizationMember.findMany({
    where: {
      organizationId,
      userId: { not: userId },
    },
    select: { userId: true },
  });

  if (orgMembers.length > 0) {
    const notificationUserIds = orgMembers.map((member) => member.userId);

    await createManyNotifications(tx, notificationUserIds, {
      type: "AGENT_CREATED",
      priority: "NORMAL",
      title: "新しいエージェントが作成されました",
      message: `「${agent.name}」が作成されました。`,
      linkUrl: `/${organizationId}/agents/${agent.id}`,
      organizationId,
      triggeredById: userId,
    });
  }

  return { id: agent.id as AgentId };
};
