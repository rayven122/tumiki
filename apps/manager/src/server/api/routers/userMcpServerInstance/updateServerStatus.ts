import { type UpdateServerStatusInput } from ".";
import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";

type UpdateServerStatusInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerStatusInput>;
};
export const updateServerStatus = async ({
  ctx,
  input,
}: UpdateServerStatusInput) => {
  const organizationId = ctx.currentOrganizationId;

  // サーバーインスタンスのステータスを更新
  return await ctx.db.userMcpServerInstance.update({
    where: {
      id: input.id,
      organizationId,
    },
    data: {
      serverStatus: input.serverStatus,
    },
  });
};
