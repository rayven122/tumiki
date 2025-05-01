import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddApiKeyInput } from ".";

type AddApiKeyInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddApiKeyInput>;
};

export const addApiKey = async ({ ctx, input }: AddApiKeyInput) => {
  const { serverToolIdsMap } = input;

  const toolGroupTools = Object.entries(serverToolIdsMap).flatMap(
    ([serverId, toolIds]) =>
      (toolIds ?? []).map((toolId) => ({
        toolId,
        userMcpServerId: serverId,
      })),
  );

  const apiKey = await ctx.db.apiKey.create({
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
