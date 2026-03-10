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
  name: z.string(),
});

export type DeleteMcpServerOutput = z.infer<typeof deleteMcpServerOutputSchema>;

export const deleteMcpServer = async (
  tx: PrismaTransactionClient,
  input: DeleteMcpServerInput,
): Promise<DeleteMcpServerOutput> => {
  const { id, organizationId } = input;

  // 削除対象のMCPサーバーが存在するか確認
  const existingServer = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existingServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "削除対象のMCPサーバーが見つかりません。すでに削除されているか、アクセス権限がない可能性があります。",
    });
  }

  // MCPサーバーを物理削除（Cascadeでテンプレートインスタンスも削除される）
  await tx.mcpServer.delete({
    where: {
      id,
      organizationId,
    },
  });

  return {
    success: true,
    id,
    name: existingServer.name,
  };
};
