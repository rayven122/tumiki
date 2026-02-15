import type { PrismaTransactionClient } from "@tumiki/db";
import { normalizeSlug } from "@tumiki/db/utils/slug";
import type { z } from "zod";
import type { AgentId } from "@/schema/ids";
import type { UpdateAgentInputSchema } from "./router";
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
      slug: true,
    },
  });

  if (!existingAgent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  // スラグが指定された場合の重複チェック
  let normalizedSlug: string | undefined;
  if (input.slug) {
    normalizedSlug = normalizeSlug(input.slug);
    // 自分自身以外で同じスラグを持つエージェントがないかチェック
    if (normalizedSlug !== existingAgent.slug) {
      const duplicateAgent = await tx.agent.findFirst({
        where: {
          slug: normalizedSlug,
          organizationId,
          id: { not: input.id },
        },
        select: { id: true },
      });
      if (duplicateAgent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "このスラグは既に使用されています",
        });
      }
    }
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
      slug: normalizedSlug,
      description: input.description,
      iconPath: input.iconPath,
      systemPrompt: input.systemPrompt,
      modelId: input.modelId,
      visibility: input.visibility,
      mcpServers: mcpServersUpdate,
      // Slack通知設定（EE機能）
      enableSlackNotification: input.enableSlackNotification,
      slackNotificationChannelId: input.slackNotificationChannelId,
      notificationPriority: input.notificationPriority,
      notifyOnlyOnFailure: input.notifyOnlyOnFailure,
    },
    select: {
      id: true,
    },
  });

  return { id: agent.id as AgentId };
};
