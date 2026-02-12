import type { z } from "zod";
import type { UpdateNameInputV2 } from "./router";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

export type UpdateNameInput = z.infer<typeof UpdateNameInputV2>;

export type UpdateNameOutput = {
  id: string;
};

/**
 * MCPサーバーの名前と説明を更新
 *
 * @param tx Prismaトランザクションクライアント
 * @param input 更新データ
 * @param organizationId 組織ID
 * @returns 更新されたMcpServer情報
 */
export const updateName = async (
  tx: PrismaTransactionClient,
  input: UpdateNameInput,
  organizationId: string,
): Promise<UpdateNameOutput> => {
  // McpServerが存在するか確認
  const existingServer = await tx.mcpServer.findUnique({
    where: {
      id: input.id,
      organizationId,
      deletedAt: null,
    },
  });

  if (!existingServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  // nameとdescriptionを更新
  const updatedServer = await tx.mcpServer.update({
    where: {
      id: input.id,
    },
    data: {
      name: input.name,
      description: input.description,
    },
  });

  return {
    id: updatedServer.id,
  };
};
