import { db } from "@tumiki/db/client";

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
