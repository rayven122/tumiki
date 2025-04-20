import type { ProtectedContext } from "../../trpc";

type FindAllWithMcpServerToolsInput = {
  ctx: ProtectedContext;
};

export const findAllWithMcpServerTools = async ({
  ctx,
}: FindAllWithMcpServerToolsInput) => {
  const mcpServers = await ctx.db.userMcpServer.findMany({
    where: {
      userId: ctx.session.user.id,
    },
    select: {
      id: true,
      name: true,
      tools: true,
      mcpServer: true,
    },
  });
  return mcpServers;
};
