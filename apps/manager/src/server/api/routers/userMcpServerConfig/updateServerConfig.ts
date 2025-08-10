import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateServerConfigInput } from ".";

type UpdateServerConfigInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateServerConfigInput>;
};

export const updateServerConfig = async ({
  ctx,
  input,
}: UpdateServerConfigInput) => {
  const currentOrganizationId = ctx.currentOrganizationId;
  if (!currentOrganizationId) {
    throw new Error("組織が選択されていません");
  }

  const userMcpServer = await ctx.db.userMcpServerConfig.findUnique({
    where: { id: input.id },
    include: {
      mcpServer: true,
    },
  });
  if (!userMcpServer) {
    throw new Error("組織のMCPサーバーが見つかりません");
  }

  // 更新する組織と、MCPサーバーの組織が一致するかチェック
  if (userMcpServer.organizationId !== currentOrganizationId) {
    throw new Error("組織のMCPサーバーが見つかりません");
  }

  // let toolsConnect: Prisma.ToolWhereUniqueInput[] = [];
  if (input.envVars) {
    const envVars = Object.keys(input.envVars);
    const isEnvVarsMatch = envVars.every((envVar) =>
      userMcpServer.mcpServer.envVars.includes(envVar),
    );
    if (!isEnvVarsMatch) {
      throw new Error("MCPサーバーの環境変数が一致しません");
    }
    // TODO: ncc による　readfile が解決されるまでコメントアウト
    // const tools = await getMcpServerTools(
    //   userMcpServer.mcpServer,
    //   input.envVars,
    // );
    // if (tools.length === 0) {
    //   throw new Error("正しい環境変数が設定されていません");
    // }

    // toolsConnect = userMcpServer.mcpServer.tools.map((tool) => ({
    //   mcpServerId_name: {
    //     mcpServerId: userMcpServer.mcpServer.id,
    //     name: tool.name,
    //   },
    // }));
  }

  return await ctx.db.userMcpServerConfig.update({
    where: { id: input.id },
    data: {
      envVars: JSON.stringify(input.envVars),
      // ...(toolsConnect.length > 0 && {
      //   tools: {
      //     connect: toolsConnect,
      //   },
      // }),
    },
  });
};
