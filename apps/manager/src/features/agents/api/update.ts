import type { PrismaTransactionClient } from "@tumiki/db";
import { normalizeSlug } from "@tumiki/db/utils/slug";
import type { z } from "zod";
import type { AgentId } from "@/schema/ids";
import type { UpdateAgentInputSchema } from "./router";
import { TRPCError } from "@trpc/server";

type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

/**
 * 既存エージェントを取得し、存在しない場合はエラー
 */
const findExistingAgentOrThrow = async (
  tx: PrismaTransactionClient,
  agentId: string,
  organizationId: string,
): Promise<{ id: string; slug: string }> => {
  const agent = await tx.agent.findFirst({
    where: { id: agentId, organizationId },
    select: { id: true, slug: true },
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  return agent;
};

/**
 * スラグの重複チェック（変更がある場合のみ）
 */
const validateSlugUniqueness = async (
  tx: PrismaTransactionClient,
  input: UpdateAgentInput,
  existingSlug: string,
  organizationId: string,
): Promise<string | undefined> => {
  if (!input.slug) return undefined;

  const normalizedSlug = normalizeSlug(input.slug);
  if (normalizedSlug === existingSlug) return normalizedSlug;

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

  return normalizedSlug;
};

/**
 * エージェントを更新する
 */
export const updateAgent = async (
  tx: PrismaTransactionClient,
  input: UpdateAgentInput,
  organizationId: string,
): Promise<{ id: AgentId }> => {
  const existingAgent = await findExistingAgentOrThrow(
    tx,
    input.id,
    organizationId,
  );
  const normalizedSlug = await validateSlugUniqueness(
    tx,
    input,
    existingAgent.slug,
    organizationId,
  );

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
      // Slack通知設定
      enableSlackNotification: input.enableSlackNotification,
      slackNotificationChannelId: input.slackNotificationChannelId,
      slackNotificationChannelName: input.slackNotificationChannelName,
      notifyOnlyOnFailure: input.notifyOnlyOnFailure,
    },
    select: {
      id: true,
    },
  });

  return { id: agent.id as AgentId };
};
