import type { PrismaClient } from "@prisma/client";

export const addUserMcpServer = async (
  db: PrismaClient,
  userId: string,
  mcpServerId: string,
  envVars: Record<string, string>,
) => {
  return await db.userMcpServer.create({
    data: { userId, mcpServerId, envVars: [] },
  });
};
