import type { z } from "zod";
import type { CreateIntegratedMcpServerInputV2 } from "./router";
import { ServerStatus, ServerType, AuthType } from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

export type CreateIntegratedMcpServerInput = z.infer<
  typeof CreateIntegratedMcpServerInputV2
>;

export type CreateIntegratedMcpServerOutput = {
  id: string;
};

/**
 * 複数のMCPサーバーテンプレートを統合したカスタムMCPサーバーを作成
 *
 * @param prisma Prismaクライアント（トランザクションクライアント）
 * @param input 作成データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 作成されたサーバー情報
 */
export const createIntegratedMcpServer = async (
  prisma: PrismaTransactionClient,
  input: CreateIntegratedMcpServerInput,
  organizationId: string,
  userId: string,
): Promise<CreateIntegratedMcpServerOutput> => {
  // 1. テンプレート存在確認とツールのバリデーション、既存McpConfigの検索
  const templates = await Promise.all(
    input.templates.map(async (tmpl) => {
      const template = await prisma.mcpServerTemplate.findUnique({
        where: { id: tmpl.mcpServerTemplateId },
        include: { mcpTools: true },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `MCPサーバーテンプレート（ID: ${tmpl.mcpServerTemplateId}）が見つかりません`,
        });
      }

      // ツールIDの存在確認（toolIdsが指定されている場合のみ）
      const templateToolIds = template.mcpTools.map((tool) => tool.id);
      if (tmpl.toolIds) {
        const invalidToolIds = tmpl.toolIds.filter(
          (toolId) => !templateToolIds.includes(toolId),
        );

        if (invalidToolIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `無効なツールIDが含まれています: ${invalidToolIds.join(", ")}`,
          });
        }
      }

      // 環境変数のバリデーション
      if (tmpl.envVars) {
        const envVars = Object.keys(tmpl.envVars);
        const isEnvVarsMatch = envVars.every((envVar) =>
          template.envVarKeys.includes(envVar),
        );
        if (!isEnvVarsMatch) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `テンプレート「${template.name}」の環境変数が一致しません`,
          });
        }
      }

      // 既存のMcpConfigのenvVarsを取得（envVarsが未指定の場合のみ）
      let existingEnvVars: string | undefined;
      if (!tmpl.envVars) {
        const existingInstance =
          await prisma.mcpServerTemplateInstance.findFirst({
            where: {
              mcpServerTemplateId: tmpl.mcpServerTemplateId,
              mcpServer: {
                organizationId,
              },
            },
            include: {
              mcpConfigs: {
                take: 1,
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          });
        existingEnvVars = existingInstance?.mcpConfigs[0]?.envVars;
      }

      // toolIdsが未指定の場合は全ツールを選択
      const resolvedToolIds = tmpl.toolIds ?? templateToolIds;

      return { template, tmpl, existingEnvVars, resolvedToolIds };
    }),
  );

  // 2. MCPサーバー作成（serverType: CUSTOM）
  const mcpServer = await prisma.mcpServer.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description ?? "",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: ServerType.CUSTOM,
      authType: AuthType.OAUTH,
      organizationId,
      displayOrder: 0,
      templateInstances: {
        create: templates.map(
          ({ template, tmpl, existingEnvVars, resolvedToolIds }, index) => ({
            mcpServerTemplateId: template.id,
            normalizedName: tmpl.normalizedName,
            isEnabled: true,
            displayOrder: index,
            allowedTools: {
              connect: resolvedToolIds.map((id) => ({ id })),
            },
            // McpConfigの作成（新規または既存のenvVarsを使用）
            ...(tmpl.envVars || existingEnvVars
              ? {
                  mcpConfigs: {
                    create: {
                      organizationId,
                      userId,
                      envVars: tmpl.envVars
                        ? JSON.stringify(tmpl.envVars)
                        : (existingEnvVars ?? "{}"),
                    },
                  },
                }
              : {}),
          }),
        ),
      },
    },
  });

  return {
    id: mcpServer.id,
  };
};
