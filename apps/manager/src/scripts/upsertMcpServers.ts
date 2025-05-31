import { MCP_SERVERS } from "apps/manager/src/constants/mcpServers";
import { db } from "apps/manager/src/server/db";

/**
 * MCP サーバーを登録する
 */
export const upsertMcpServers = async () => {
  const upsertPromises = MCP_SERVERS.map((serverData) => {
    return db.mcpServer.upsert({
      where: {
        name: serverData.name,
      },
      update: {
        ...serverData,
      },
      create: {
        ...serverData,
      },
    });
  });
  const upsertedMcpServers = await db.$transaction(upsertPromises);

  console.log("MCPサーバーが正常に登録されました:");
  console.log(JSON.stringify(upsertedMcpServers, null, 2));
};
