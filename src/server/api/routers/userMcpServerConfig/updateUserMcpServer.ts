import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { UpdateUserMcpServerInput } from ".";
// import { getMcpServerTools } from "@/utils/server/getMcpServerTools";
// import type { Prisma } from "@prisma/client";

type UpdateUserMcpServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateUserMcpServerInput>;
};

export const updateUserMcpServer = async ({
  ctx,
  input,
}: UpdateUserMcpServerInput) => {
  const userMcpServer = await ctx.db.userMcpServer.findUnique({
    where: { id: input.id },
    include: {
      mcpServer: true,
    },
  });
  if (!userMcpServer) {
    throw new Error("ユーザーのMCPサーバーが見つかりません");
  }

  // 更新するユーザと、ユーザmcpサーバーのユーザが一致するかチェック
  if (userMcpServer.userId !== ctx.session.user.id) {
    throw new Error("ユーザーのMCPサーバーが見つかりません");
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

  return await ctx.db.userMcpServer.update({
    where: { id: input.id },
    data: {
      name: input.name,
      // imageUrl: input.imageUrl,
      envVars: input.envVars,
      // ...(toolsConnect.length > 0 && {
      //   tools: {
      //     connect: toolsConnect,
      //   },
      // }),
    },
  });
};
