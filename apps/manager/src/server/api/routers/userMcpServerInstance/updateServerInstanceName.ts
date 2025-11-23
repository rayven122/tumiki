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
        mcpConfig: true,
      },
    });

    // 公式サーバーの場合は、mcpConfig の name も更新する
    if (
      serverInstance.serverType === ServerType.OFFICIAL &&
      serverInstance.mcpConfigId
    ) {
      await tx.mcpConfig.update({
        where: {
          id: serverInstance.mcpConfigId,
          organizationId,
        },
        data: {
          name: input.name,
        },
      });
    }
    return serverInstance;
  });

  return serverInstance;
};
