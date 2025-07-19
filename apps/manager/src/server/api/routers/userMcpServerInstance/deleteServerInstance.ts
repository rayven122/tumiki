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
    // 論理削除を実行
    const serverInstance = await tx.userMcpServerInstance.update({
      where: {
        id,
        userId: ctx.session.user.id,
        deletedAt: null, // 既に削除されていないことを確認
      },
      data: {
        deletedAt: new Date(),
      },
      select: {
        serverType: true,
        toolGroupId: true,
      },
    });

    // ツールグループも論理削除または無効化
    const toolGroup = await tx.userToolGroup.update({
      where: {
        id: serverInstance.toolGroupId,
        userId: ctx.session.user.id,
      },
      data: {
        isEnabled: false,
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
      // 公式サーバーの設定は物理削除のまま（機密情報を含むため）
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
