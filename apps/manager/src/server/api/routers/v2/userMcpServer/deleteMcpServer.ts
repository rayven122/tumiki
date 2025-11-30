import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { McpServerIdSchema } from "@/schema/ids";

type DeleteMcpServerInput = {
  id: z.infer<typeof McpServerIdSchema>;
  organizationId: string;
};

export const deleteMcpServerInputSchema = z.object({
  id: McpServerIdSchema,
});

export const deleteMcpServerOutputSchema = z.object({
  success: z.boolean(),
  id: McpServerIdSchema,
});

export type DeleteMcpServerOutput = z.infer<typeof deleteMcpServerOutputSchema>;

export const deleteMcpServer = async (
  tx: PrismaTransactionClient,
  input: DeleteMcpServerInput,
): Promise<DeleteMcpServerOutput> => {
  const { id, organizationId } = input;

  // 既存のMCPサーバーを取得して存在確認
  const existingServer = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existingServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  // 物理削除を実行
  await tx.mcpServer.delete({
    where: {
      id,
      organizationId,
    },
  });

  return {
    success: true,
    id,
  };
};
