import type { ProtectedContext } from "../../trpc";

type FindAllWithToolsInput = {
  ctx: ProtectedContext;
};

export const findAllWithTools = async ({ ctx }: FindAllWithToolsInput) => {
  const mcpServers = await ctx.db.userMcpServerConfig.findMany({
    where: {
      userId: ctx.session.user.id,
    },
    orderBy: {
      // 作成した順にソート
      createdAt: "asc",
    },
    include: {
      tools: true,
      mcpServer: true,
    },
  });

  return mcpServers;
};
