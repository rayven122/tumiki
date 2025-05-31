import { db } from "apps/manager/src/server/db";

export const findAllWithTools = async () => {
  const mcpServers = await db.mcpServer.findMany({
    where: {
      isPublic: true,
    },
    include: {
      tools: true,
    },
  });
  return mcpServers;
};
