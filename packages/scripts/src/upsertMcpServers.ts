import { db } from "@tumiki/db";

import { MCP_SERVERS } from "./constants/mcpServers";

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
  console.log(`登録されたMCPサーバー数: ${upsertedMcpServers.length}`);
  console.log(
    "登録されたMCPサーバーの詳細:",
    upsertedMcpServers.map((server) => server.name),
  );
};
