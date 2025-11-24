import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceInput } from ".";
import { ServerType } from "@tumiki/db/prisma";

type UpdateServerInstanceInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerInstanceInput>;
};

/**
 * 新スキーマ：サーバーインスタンス更新
 * - toolGroup削除、allowedToolsの多対多リレーション使用
 * - serverToolIdsMap → allowedToolIds
 * - userMcpServerConfig → mcpConfig
 */
export const updateServerInstance = async ({
  ctx,
  input,
}: UpdateServerInstanceInputProps) => {
  const { id, name, description, allowedToolIds } = input;

  const organizationId = ctx.currentOrganizationId;

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    // 既存のサーバーインスタンスを取得
    const existingServer = await tx.mcpServer.findUnique({
      where: {
        id,
        organizationId,
      },
      select: {
        serverType: true,
        mcpServerTemplates: {
          select: { id: true },
        },
        allowedTools: {
          select: { id: true },
        },
      },
    });

    if (!existingServer) {
      throw new Error("サーバーインスタンスが見つかりません");
    }

    // allowedToolsを更新（既存を削除して新しいものを接続）
    const currentToolIds = existingServer.allowedTools.map((t) => t.id);
    const toolsToDisconnect = currentToolIds.filter(
      (id) => !allowedToolIds.includes(id as string),
    );
    const toolsToConnect = allowedToolIds.filter(
      (id) => !currentToolIds.includes(id as string),
    );

    const updatedServer = await tx.mcpServer.update({
      where: {
        id,
        organizationId,
      },
      data: {
        name,
        description,
        allowedTools: {
          disconnect: toolsToDisconnect.map((id) => ({ id })),
          connect: toolsToConnect.map((id) => ({ id: id as string })),
        },
      },
    });

    // 公式サーバーの場合は、mcpConfig も更新する
    if (existingServer.serverType === ServerType.OFFICIAL) {
      // mcpServerTemplate経由でMcpConfigを取得
      const mcpServerTemplateId = existingServer.mcpServerTemplates[0]?.id;
      if (mcpServerTemplateId) {
        const mcpConfig = await tx.mcpConfig.findFirst({
          where: {
            mcpServerTemplateId,
            organizationId,
          },
        });
        if (mcpConfig) {
          await tx.mcpConfig.update({
            where: { id: mcpConfig.id },
            data: { envVars: mcpConfig.envVars }, // envVarsをそのまま保持
          });
        }
      }
    }

    return updatedServer;
  });

  return serverInstance;
};
