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
  if (!isEnvVarsMatch) {
    throw new Error("MCPサーバーの環境変数が一致しません");
  }

  // TODO: ncc による　readfile が解決されるまでコメントアウト
  // const tools = await getMcpServerTools(mcpServer, input.envVars);
  // if (tools.length === 0) {
  //   throw new Error("正しい環境変数が設定されていません");
  // }

  const data = await ctx.db.$transaction(async (tx) => {
    const serverConfig = await tx.userMcpServerConfig.create({
      data: {
        userId: ctx.session.user.id,
        name: mcpServer.name,
        description: "",
        mcpServerId: input.mcpServerId,
        envVars: JSON.stringify(input.envVars),
        tools: { connect: mcpServer.tools.map(({ id }) => ({ id })) },
      },
    });

    const toolGroupTools = mcpServer.tools.map((tool) => ({
      toolId: tool.id,
      userMcpServerConfigId: serverConfig.id,
    }));

    const toolGroup = await tx.userToolGroup.create({
      data: {
        userId: ctx.session.user.id,
        name: mcpServer.name,
        description: "",
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
        name: mcpServer.name,
        description: "",
        serverStatus: ServerStatus.PENDING,
        serverType: ServerType.OFFICIAL,
        toolGroupId: toolGroup.id,
        apiKeys: {
          create: {
            name: `${mcpServer.name} API Key`,
            apiKey: fullKey,
            userId: ctx.session.user.id,
          },
        },
      },
    });

    return data;
  });

  return data;
};
