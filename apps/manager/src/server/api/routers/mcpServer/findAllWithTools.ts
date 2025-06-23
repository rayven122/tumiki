import "server-only";

import { db } from "@tumiki/db";

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
