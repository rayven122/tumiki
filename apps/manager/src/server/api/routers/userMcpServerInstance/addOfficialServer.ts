import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";

import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import type { AddOfficialServerInput } from ".";
import { generateApiKey } from "@/utils/server";

type AddOfficialServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddOfficialServerInput>;
};

export const addOfficialServer = async ({
  ctx,
  input,
}: AddOfficialServerInput) => {
  const mcpServer = await ctx.db.mcpServer.findUnique({
    where: { id: input.mcpServerId },
    include: {
      tools: true,
    },
  });
  if (!mcpServer) {
    throw new Error("MCPサーバーが見つかりません");
  }

  const envVars = Object.keys(input.envVars);
  const isEnvVarsMatch = envVars.every((envVar) =>
    mcpServer.envVars.includes(envVar),
  );
  if (!isEnvVarsMatch && !input.isPending) {
    throw new Error("MCPサーバーの環境変数が一致しません");
  }

  const organizationId = ctx.currentOrganizationId;

  const data = await ctx.db.$transaction(async (tx) => {
    const serverConfig = await tx.userMcpServerConfig.create({
      data: {
        organizationId,
        name: input.name,
        description: "",
        mcpServerId: input.mcpServerId,
        envVars: JSON.stringify(input.envVars),
      },
    });

    const toolGroupTools = mcpServer.tools.map((tool) => ({
      toolId: tool.id,
      userMcpServerConfigId: serverConfig.id,
    }));

    const toolGroup = await tx.userToolGroup.create({
      data: {
        organizationId,
        name: input.name,
        description: "",
        toolGroupTools: {
          createMany: {
            data: toolGroupTools,
          },
        },
      },
    });

    // OAuth認証待ちの場合はAPIキーを生成しない
    const fullKey = input.isPending ? undefined : generateApiKey();

    const data = await tx.userMcpServerInstance.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description ?? "",
        // OAuth認証待ちの場合はPENDING、それ以外はRUNNING
        serverStatus: input.isPending
          ? ServerStatus.PENDING
          : ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        toolGroupId: toolGroup.id,
        apiKeys:
          input.isPending || !fullKey
            ? undefined
            : {
                create: {
                  name: `${input.name} API Key`,
                  apiKey: fullKey,
                },
              },
      },
    });

    return {
      instance: data,
      configId: serverConfig.id,
      toolGroupId: toolGroup.id,
    };
  });

  return {
    id: data.instance.id,
    userMcpServerConfigId: data.configId,
    toolGroupId: data.toolGroupId,
  };
};
