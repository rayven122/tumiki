import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceInput } from ".";
import { ServerType } from "@tumiki/db/prisma";

type UpdateServerInstanceInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerInstanceInput>;
};

export const updateServerInstance = async ({
  ctx,
  input,
}: UpdateServerInstanceInput) => {
  const { serverToolIdsMap } = input;

  const organizationId = ctx.currentOrganizationId;

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
        organizationId,
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
        mcpServerInstance: {
          update: {
            name: input.name,
            description: input.description,
          },
        },
      },
      include: {
        toolGroupTools: true,
        mcpServerInstance: true,
      },
    });

    const userMcpServerConfigId =
      toolGroup.toolGroupTools[0]?.userMcpServerConfigId;

    // 公式サーバーの場合は、userMcpServerConfig の name も更新する
    if (
      toolGroup.mcpServerInstance?.serverType === ServerType.OFFICIAL &&
      userMcpServerConfigId
    ) {
      await tx.userMcpServerConfig.update({
        where: {
          id: userMcpServerConfigId,
          organizationId,
        },
        data: {
          name: input.name,
        },
      });
    }

    return toolGroup.mcpServerInstance;
  });

  return serverInstance;
};
