import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddApiKeyInput, UpdateApiKeyInput } from ".";

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
      id: input.id,
    },
    data: {
      name: input.name,
      description: input.description,
      userId: ctx.session.user.id,
      toolGroups: {
        create: {
          name: input.name,
          description: input.description,
          order: [],
          userId: ctx.session.user.id,
          toolGroupTools: {
            createMany: {
              data: toolGroupTools,
            },
          },
        },
      },
    },
  });

  return apiKey;
};
