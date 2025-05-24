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
  // サーバーインスタンスのステータスを更新
  return await ctx.db.userMcpServerInstance.update({
    where: {
      id: input.id,
      userId: ctx.session.user.id,
    },
    data: {
      serverStatus: input.serverStatus,
    },
  });
};
