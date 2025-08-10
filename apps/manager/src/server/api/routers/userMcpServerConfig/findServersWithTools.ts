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
      organizationId: ctx.currentOrganizationId,
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
      mcpServer: {
        include: {
          tools: true,
        },
      },
      userToolGroupTools: {
        include: {
          tool: true,
        },
      },
    },
  });

  // toolsプロパティを追加して返す
  return mcpServers.map((server) => ({
    ...server,
    tools: server.userToolGroupTools.map((utt) => utt.tool),
  }));
};
