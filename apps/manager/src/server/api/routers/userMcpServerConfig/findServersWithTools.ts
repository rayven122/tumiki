import type { z } from "zod";
import type { FindAllWithToolsInput } from ".";
import type { ProtectedContext } from "../../trpc";

type FindAllWithToolsInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof FindAllWithToolsInput>;
};

export const findServersWithTools = async ({
  ctx,
  input,
}: FindAllWithToolsInput) => {
  const mcpServers = await ctx.db.userMcpServerConfig.findMany({
    where: {
      userId: ctx.session.user.id,
      ...(input.userMcpServerConfigIds && {
        id: {
          in: input.userMcpServerConfigIds,
        },
      }),
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
