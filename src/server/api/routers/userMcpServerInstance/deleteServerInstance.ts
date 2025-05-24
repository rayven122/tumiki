import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { DeleteServerInstanceInput } from ".";
import { ServerType } from "@prisma/client";

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
        mcpServerConfigs: {
          select: {
            id: true,
          },
        },
      },
    });

    await tx.userToolGroup.delete({
      where: {
        id: serverInstance.toolGroupId,
        userId: ctx.session.user.id,
      },
    });

    // 公式サーバーの場合は、公式サーバーの設定を削除
    if (
      serverInstance.serverType === ServerType.OFFICIAL &&
      // 公式サーバーの場合は、設定1つしか紐づいていないため、そちらの確認も行う
      serverInstance.mcpServerConfigs.length === 1 &&
      serverInstance.mcpServerConfigs[0]
    ) {
      await tx.userMcpServerConfig.delete({
        where: {
          id: serverInstance.mcpServerConfigs[0].id,
        },
      });
    }

    return serverInstance;
  });
};
