import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddCustomServerInput } from ".";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { generateApiKey } from "@/utils/server";

type AddCustomServerParams = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddCustomServerInput>;
};

export const addCustomServer = async ({
  ctx,
  input,
}: AddCustomServerParams) => {
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

    // TODO: UIが無い間は、MCPサーバーの追加時に、APIキーを生成させる
    // api key を作成
    const fullKey = generateApiKey();

    const data = await tx.userMcpServerInstance.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        description: input.description,
        serverStatus: ServerStatus.PENDING,
        serverType: ServerType.CUSTOM,
        toolGroupId: toolGroup.id,
        apiKeys: {
          create: {
            name: `${input.name} API Key`,
            apiKey: fullKey,
            userId: ctx.session.user.id,
          },
        },
        // TODO: mcpServerInstanceToolGroups を追加する
      },
    });

    return data;
  });

  return serverInstance;
};
