import { db } from "@tumiki/db/server";

import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * MCP サーバーを登録する
 */
export const upsertMcpServers = async () => {
  const mcpServers = await db.mcpServer.findMany({
    // 作成者が設定されていないMCPサーバーを取得
    where: {
      createdBy: null,
    },
  });

  const upsertPromises = MCP_SERVERS.map((serverData) => {
    const existingServer = mcpServers.find(
      (server) => server.name === serverData.name,
    );

    return db.mcpServer.upsert({
      where: { id: existingServer ? existingServer.id : "" },
      update: {
        ...serverData,
        visibility: "PUBLIC",
      },
      create: {
        ...serverData,
        visibility: "PUBLIC",
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
