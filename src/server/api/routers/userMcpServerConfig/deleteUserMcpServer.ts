import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteUserMcpServerInput } from ".";

type DeleteUserMcpServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteUserMcpServerInput>;
};

export const deleteUserMcpServer = async ({
  ctx,
  input,
}: DeleteUserMcpServerInput) => {
  const userMcpServer = await ctx.db.userMcpServer.findUnique({
    where: { id: input.id },
    include: {
      mcpServer: true,
    },
  });
  if (!userMcpServer) {
    throw new Error("ユーザーのMCPサーバーが見つかりません");
  }

  // 更新するユーザと、ユーザmcpサーバーのユーザが一致するかチェック
  if (userMcpServer.userId !== ctx.session.user.id) {
    throw new Error("ユーザーのMCPサーバーが見つかりません");
  }

  return await ctx.db.userMcpServer.delete({
    where: { id: input.id },
  });
};
