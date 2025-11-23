import { type UpdateServerStatusInput } from ".";
import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";

type UpdateServerStatusInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerStatusInput>;
};

/**
 * 新スキーマ：サーバーステータス更新
 * - userMcpServerInstance → mcpServer
 */
export const updateServerStatus = async ({
  ctx,
  input,
}: UpdateServerStatusInput) => {
  const organizationId = ctx.currentOrganizationId;

  // サーバーインスタンスのステータスを更新
  return await ctx.db.mcpServer.update({
    where: {
      id: input.id,
      organizationId,
    },
    data: {
      serverStatus: input.serverStatus,
    },
  });
};
