import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceNameInput } from ".";
import { ServerType } from "@tumiki/db/prisma";

type UpdateServerInstanceNameInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerInstanceNameInput>;
};

/**
 * 新スキーマ：サーバーインスタンス名更新
 * - UserMcpServerInstance → McpServer
 * - UserToolGroup削除
 * - UserMcpServerConfig → McpConfig
 */
export const updateServerInstanceName = async ({
  ctx,
  input,
}: UpdateServerInstanceNameInputProps) => {
  const organizationId = ctx.currentOrganizationId;

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    const serverInstance = await tx.mcpServer.update({
      where: {
        id: input.id,
        organizationId,
      },
      data: {
        name: input.name,
        description: input.description,
      },
      include: {
        mcpServerTemplates: {
          select: { id: true },
        },
      },
    });

    // 公式サーバーの場合は、mcpConfig の envVars を保持
    if (serverInstance.serverType === ServerType.OFFICIAL) {
      // mcpServerTemplate経由でMcpConfigを取得
      const mcpServerTemplateId = serverInstance.mcpServerTemplates[0]?.id;
      if (mcpServerTemplateId) {
        const mcpConfig = await tx.mcpConfig.findFirst({
          where: {
            mcpServerTemplateId,
            organizationId,
          },
        });
        if (mcpConfig) {
          // McpConfigにはnameフィールドが存在しないため、envVarsをそのまま保持
          await tx.mcpConfig.update({
            where: {
              id: mcpConfig.id,
            },
            data: {
              envVars: mcpConfig.envVars,
            },
          });
        }
      }
    }
    return serverInstance;
  });

  return serverInstance;
};
