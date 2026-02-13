import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { buildAgentAccessCondition } from "./utils";

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
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconPath: true,
      systemPrompt: true,
      modelId: true,
      visibility: true,
      organizationId: true,
      createdById: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      mcpServers: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          iconPath: true,
          serverStatus: true,
          // テンプレートのiconPathをフォールバックとして取得
          templateInstances: {
            select: {
              mcpServerTemplate: {
                select: {
                  iconPath: true,
                },
              },
            },
            take: 1,
          },
        },
      },
      schedules: {
        select: {
          id: true,
          name: true,
          cronExpression: true,
          timezone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      executionLogs: {
        select: {
          id: true,
          scheduleId: true,
          success: true,
          durationMs: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10, // 最新10件のみ
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "エージェントが見つかりません",
    });
  }

  return agent;
};
