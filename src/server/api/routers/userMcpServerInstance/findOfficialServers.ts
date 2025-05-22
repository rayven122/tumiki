import { ServerType } from "@prisma/client";
import type { ProtectedContext } from "../../trpc";

type FindOfficialServersInput = {
  ctx: ProtectedContext;
};

export const findOfficialServers = async ({
  ctx,
}: FindOfficialServersInput) => {
  const officialServers = await ctx.db.userMcpServerConfig.findMany({
    where: {
      // serverType: ServerType.OFFICIAL,
    },
    select: {
      id: true,
      name: true,
      tools: true,
      mcpServer: true,
      toolGroupTool: {
        include: {
          toolGroup: {
            include: {
              mcpServerInstances: true,
            },
          },
        },
      },
    },
  });

  return officialServers;
};
