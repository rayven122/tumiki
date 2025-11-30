import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus } from "@tumiki/db/prisma";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";

type UpdateServerStatusInput = {
  id: McpServerId;
  isEnabled: boolean;
  organizationId: string;
};

// サーバーステータス更新のレスポンススキーマ
export const updateServerStatusOutputSchema = z.object({
  id: z.string(),
  serverStatus: z.enum(["RUNNING", "STOPPED", "ERROR", "PENDING"]),
});

export type UpdateServerStatusOutput = z.infer<
  typeof updateServerStatusOutputSchema
>;

export const updateServerStatus = async (
  tx: PrismaTransactionClient,
  input: UpdateServerStatusInput,
): Promise<UpdateServerStatusOutput> => {
  const { id, isEnabled, organizationId } = input;

  // サーバーの存在確認
  const server = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // ステータスを更新
  const newStatus = isEnabled ? ServerStatus.RUNNING : ServerStatus.STOPPED;

  const updatedServer = await tx.mcpServer.update({
    where: {
      id,
    },
    data: {
      serverStatus: newStatus,
    },
  });

  return {
    id: updatedServer.id,
    serverStatus: updatedServer.serverStatus,
  };
};
