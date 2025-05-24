import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddUserOfficialServerInput } from ".";
import { ServerStatus, ServerType } from "@prisma/client";

type AddUserOfficialServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddUserOfficialServerInput>;
};

export const addUserOfficialServer = async ({
  ctx,
  input,
}: AddUserOfficialServerInput) => {
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

  const tools = mcpServer.tools.map((tool) => ({
    toolId: tool.id,
  }));

  const data = await ctx.db.$transaction(async (tx) => {
    const toolGroup = await tx.userToolGroup.create({
      data: {
        userId: ctx.session.user.id,
        name: mcpServer.name,
        description: "",
        toolGroupTools: {
          createMany: {
            data: tools,
          },
        },
      },
    });
    const data = await tx.userMcpServerConfig.create({
      data: {
        userId: ctx.session.user.id,
        mcpServerId: input.mcpServerId,
        envVars: JSON.stringify(input.envVars),
        tools: { connect: tools.map((tool) => ({ id: tool.toolId })) },
        mcpServerInstances: {
          create: {
            name: mcpServer.name,
            description: "",
            serverStatus: ServerStatus.RUNNING,
            serverType: ServerType.OFFICIAL,
            userId: ctx.session.user.id,
            toolGroupId: toolGroup.id,
          },
        },
      },
    });

    return data;
  });

  return data;
};
