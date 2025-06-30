import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddCustomServerInput } from ".";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "../mcpApiKey";

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
    const data = await tx.userMcpServerInstance.create({
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

    // TODO: UIが無い間は、MCPサーバーの追加時に、APIキーを生成させる
    // api key を作成
    const fullKey = generateApiKey();
    await tx.mcpApiKey.create({
      data: {
        name: `${data.name} API Key`,
        apiKey: fullKey,
        userMcpServerInstanceId: data.id,
        userId: ctx.session.user.id,
      },
    });
    return data;
  });

  return serverInstance;
};
