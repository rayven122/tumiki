import type { PrismaTransactionClient } from "@tumiki/db";
import { generateUniqueAgentSlug, normalizeSlug } from "@tumiki/db/utils/slug";
import type { z } from "zod";
import type { AgentId } from "@/schema/ids";
import type { CreateAgentInputSchema } from "./router";
import { createManyNotifications } from "@/features/notification";
import { TRPCError } from "@trpc/server";

type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

/**
 * スラグを解決する（指定があれば検証、なければ自動生成）
 */
const resolveAgentSlug = async (
  tx: PrismaTransactionClient,
  input: CreateAgentInput,
  organizationId: string,
): Promise<string> => {
  if (!input.slug) {
    return generateUniqueAgentSlug(tx, input.name, organizationId);
  }

  const slug = normalizeSlug(input.slug);
  const existingAgent = await tx.agent.findFirst({
    where: { slug, organizationId },
    select: { id: true },
  });

  if (existingAgent) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "このスラグは既に使用されています",
    });
  }

  return slug;
};

/**
 * エージェントを作成する
 */
export const createAgent = async (
  tx: PrismaTransactionClient,
  input: CreateAgentInput,
  organizationId: string,
  userId: string,
): Promise<{ id: AgentId; slug: string }> => {
  // スラグの決定（指定がなければ名前から自動生成）
  const slug = await resolveAgentSlug(tx, input, organizationId);

  const agent = await tx.agent.create({
    data: {
      slug,
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
      // Slack通知設定
      enableSlackNotification: input.enableSlackNotification,
      slackNotificationChannelId: input.slackNotificationChannelId,
      slackNotificationChannelName: input.slackNotificationChannelName,
      notifyOnlyOnFailure: input.notifyOnlyOnFailure,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  // 組織のslugを取得（通知URL用）
  const organization = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });

  // 組織の全メンバーに通知を作成（作成者自身を除く）
  const orgMembers = await tx.organizationMember.findMany({
    where: {
      organizationId,
      userId: { not: userId },
    },
    select: { userId: true },
  });

  if (orgMembers.length > 0 && organization) {
    const notificationUserIds = orgMembers.map((member) => member.userId);

    await createManyNotifications(tx, notificationUserIds, {
      type: "AGENT_CREATED",
      priority: "NORMAL",
      title: "新しいエージェントが作成されました",
      message: `「${agent.name}」が作成されました。`,
      // スラグベースのURLを使用
      linkUrl: `/${organization.slug}/agents/${agent.slug}`,
      organizationId,
      triggeredById: userId,
    });
  }

  return { id: agent.id as AgentId, slug: agent.slug };
};
