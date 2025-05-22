import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateApiKeyInput } from ".";

type UpdateApiKeyInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateApiKeyInput>;
};

export const updateApiKey = async ({ ctx, input }: UpdateApiKeyInput) => {
  const { serverToolIdsMap } = input;

  const toolGroupTools = Object.entries(serverToolIdsMap).flatMap(
    ([serverId, toolIds]) =>
      (toolIds ?? []).map((toolId) => ({
        toolId,
        userMcpServerId: serverId,
      })),
  );

  const apiKey = await ctx.db.apiKey.update({
    where: {
      id: input.id, // 更新対象のAPIキーID
    },
    data: {
      name: input.name,
      description: input.description,
      toolGroups: {
        update: {
          where: {
            id: input.apiKeyToolGroupId, // 更新対象のツールグループID
          },
          data: {
            // toolGroupToolsの更新
            toolGroupTools: {
              // 既存のtoolGroupToolsを削除
              deleteMany: {},
              // 新しいtoolGroupToolsを作成
              createMany: {
                data: toolGroupTools,
              },
            },
          },
        },
      },
    },
  });

  return apiKey;
};
