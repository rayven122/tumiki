import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerInstanceInput } from ".";
import type { UserMcpServerConfigId } from "@/schema/ids";

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
    ([serverId, toolIds]) =>
      (toolIds ?? []).map((toolId) => ({
        toolId,
        userMcpServerId: serverId,
      })),
  );

  const mcpServerConfigIds = Object.keys(serverToolIdsMap).map((serverId) => ({
    id: serverId as UserMcpServerConfigId,
  }));

  const toolGroup = await ctx.db.userToolGroup.update({
    where: {
      id: input.ServerInstanceToolGroupId,
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

  const serverInstance = await ctx.db.userMcpServerInstance.update({
    where: {
      id: input.id, // 更新対象のAPIキーID
    },
    data: {
      name: input.name,
      description: input.description,
      serverStatus: input.serverStatus,
      serverType: input.serverType,
      toolGroupId: toolGroup.id,
      mcpServerConfigs: {
        connect: mcpServerConfigIds,
      },
      // TODO: mcpServerInstanceToolGroups を追加する
      mcpServerInstanceToolGroups: {
        connect: [],
      },
    },
  });

  return serverInstance;
};
