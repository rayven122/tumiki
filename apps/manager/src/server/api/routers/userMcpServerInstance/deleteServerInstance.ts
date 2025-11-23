import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteServerInstanceInput } from ".";
import { ServerType } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";

type DeleteServerInstanceInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteServerInstanceInput>;
};

/**
 * 新スキーマ：サーバーインスタンス削除
 * - UserMcpServerInstance → McpServer
 * - UserToolGroup削除
 * - UserMcpServerConfig → McpConfig
 */
export const deleteServerInstance = async ({
  ctx,
  input,
}: DeleteServerInstanceInputProps) => {
  const { id } = input;

  const organizationId = ctx.currentOrganizationId;

  return await ctx.db.$transaction(async (tx) => {
    // 既存のインスタンスを取得して状態確認
    const existingInstance = await tx.mcpServer.findUnique({
      where: {
        id,
        organizationId,
      },
      select: {
        deletedAt: true,
        name: true,
        serverType: true,
        mcpConfigId: true,
      },
    });

    if (!existingInstance) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCPサーバーインスタンスが見つかりません",
      });
    }

    if (existingInstance.deletedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `MCPサーバーインスタンス「${existingInstance.name}」は既に削除されています`,
      });
    }

    // 論理削除を実行
    const serverInstance = await tx.mcpServer.update({
      where: {
        id,
        organizationId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: {
        serverType: true,
        mcpConfigId: true,
      },
    });

    // 公式サーバーの場合は、公式サーバーの設定を削除
    if (
      serverInstance.serverType === ServerType.OFFICIAL &&
      serverInstance.mcpConfigId
    ) {
      // 公式サーバーの設定は物理削除のまま（機密情報を含むため）
      await tx.mcpConfig.delete({
        where: {
          id: serverInstance.mcpConfigId,
          organizationId,
        },
      });
    }

    return serverInstance;
  });
};
