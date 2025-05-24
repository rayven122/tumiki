import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddCustomServerInput } from ".";
import { ServerStatus, ServerType } from "@prisma/client";

type AddCustomServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddCustomServerInput>;
};

export const addCustomServer = async ({ ctx, input }: AddCustomServerInput) => {
  const { serverToolIdsMap } = input;

  const toolGroupTools = Object.entries(serverToolIdsMap).flatMap(
    ([userMcpServerConfigId, toolIds]) =>
      (toolIds ?? []).map((toolId) => ({
        toolId,
        userMcpServerConfigId,
      })),
  );

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    const toolGroup = await tx.userToolGroup.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        description: input.description,
        toolGroupTools: {
          createMany: {
            data: toolGroupTools,
          },
        },
      },
    });
    return await tx.userMcpServerInstance.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        description: input.description,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.CUSTOM,
        toolGroupId: toolGroup.id,
        // TODO: mcpServerInstanceToolGroups を追加する
      },
    });
  });

  return serverInstance;
};
