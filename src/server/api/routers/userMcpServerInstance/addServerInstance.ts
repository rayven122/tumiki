import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddServerInstanceInput } from ".";
import { ServerStatus, ServerType } from "@prisma/client";
import type { UserMcpServerConfigId } from "@/schema/ids";

type AddServerInstanceInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddServerInstanceInput>;
};

export const addServerInstance = async ({
  ctx,
  input,
}: AddServerInstanceInput) => {
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

  const serverInstance = await ctx.db.$transaction(async (tx) => {
    const toolGroup = await tx.userToolGroup.create({
      data: {
        name: input.name,
        description: input.description,
        userId: ctx.session.user.id,
        toolGroupTools: {
          createMany: {
            data: toolGroupTools,
          },
        },
      },
    });
    return await tx.userMcpServerInstance.create({
      data: {
        name: input.name,
        description: input.description,
        userId: ctx.session.user.id,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.CUSTOM,
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
  });

  return serverInstance;
};
