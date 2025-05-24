import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceInput } from ".";

type UpdateServerInstanceInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerInstanceInput>;
};

export const updateServerInstance = async ({
  ctx,
  input,
}: UpdateServerInstanceInput) => {
  const { serverToolIdsMap } = input;

  const toolGroupTools = Object.entries(serverToolIdsMap).flatMap(
    ([userMcpServerConfigId, toolIds]) =>
      (toolIds ?? []).map((toolId) => ({
        toolId,
        userMcpServerConfigId,
      })),
  );

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    const toolGroup = await tx.userToolGroup.update({
      where: {
        id: input.toolGroupId,
        userId: ctx.session.user.id,
      },
      data: {
        name: input.name,
        description: input.description,
        toolGroupTools: {
          // 既存のtoolGroupToolsを削除
          deleteMany: {},
          // 新しいtoolGroupToolsを作成
          createMany: {
            data: toolGroupTools,
          },
        },
      },
    });

    const serverInstance = await tx.userMcpServerInstance.update({
      where: {
        id: input.id, // 更新対象のAPIキーID
      },
      data: {
        name: input.name,
        description: input.description,
        toolGroupId: toolGroup.id,
        // TODO: mcpServerInstanceToolGroups を追加する
      },
    });
    return serverInstance;
  });

  return serverInstance;
};
