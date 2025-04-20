import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { AddUserMcpServerInput } from ".";
import { getMcpServerTools } from "@/utils/server/getMcpServerTools";

type AddUserMcpServerInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof AddUserMcpServerInput>;
};

export const addUserMcpServer = async ({
  ctx,
  input,
}: AddUserMcpServerInput) => {
  const mcpServer = await ctx.db.mcpServer.findUnique({
    where: { id: input.mcpServerId },
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

  const tools = await getMcpServerTools(mcpServer, input.envVars);
  if (tools.length === 0) {
    throw new Error("正しい環境変数が設定されていません");
  }

  return await ctx.db.userMcpServer.create({
    data: {
      userId: ctx.session.user.id,
      mcpServerId: input.mcpServerId,
      envVars: JSON.stringify(input.envVars),
      tools: {
        connect: tools.map((tool) => ({
          mcpServerId_name: {
            mcpServerId: input.mcpServerId,
            name: tool.name,
          },
        })),
      },
    },
  });
};
