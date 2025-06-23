import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteServerInstanceInput } from ".";
import { ServerType } from "@tumiki/db/prisma";

type DeleteServerInstanceInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteServerInstanceInput>;
};

export const deleteServerInstance = async ({
  ctx,
  input,
}: DeleteServerInstanceInput) => {
  const { id } = input;

  return await ctx.db.$transaction(async (tx) => {
    const serverInstance = await tx.userMcpServerInstance.delete({
      where: {
        id,
        userId: ctx.session.user.id,
      },
      select: {
        serverType: true,
        toolGroupId: true,
      },
    });

    const toolGroup = await tx.userToolGroup.delete({
      where: {
        id: serverInstance.toolGroupId,
        userId: ctx.session.user.id,
        mcpServerInstance: null,
      },
      include: {
        toolGroupTools: true,
      },
    });

    const userMcpServerConfigId =
      toolGroup.toolGroupTools[0]?.userMcpServerConfigId;

    // 公式サーバーの場合は、公式サーバーの設定を削除
    if (
      serverInstance.serverType === ServerType.OFFICIAL &&
      userMcpServerConfigId
    ) {
      await tx.userMcpServerConfig.delete({
        where: {
          id: userMcpServerConfigId,
          userId: ctx.session.user.id,
        },
      });
    }

    return serverInstance;
  });
};
