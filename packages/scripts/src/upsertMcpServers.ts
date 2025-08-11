import { db } from "@tumiki/db/server";

import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * MCP サーバーを登録する
 * @param validServerNames 有効なサーバー名のリスト（環境変数が設定されているサーバー）
 */
export const upsertMcpServers = async (validServerNames?: string[]) => {
  const mcpServers = await db.mcpServer.findMany({
    // 作成者が設定されていないMCPサーバーを取得
    where: {
      createdBy: null,
    },
  });

  // 有効なサーバーのみをフィルタリング
  const serversToUpsert = validServerNames 
    ? MCP_SERVERS.filter(server => validServerNames.includes(server.name))
    : MCP_SERVERS;
  
  // スキップされたサーバーを特定
  const skippedServers = MCP_SERVERS.filter(
    server => !serversToUpsert.includes(server)
  );
  
  if (skippedServers.length > 0) {
    console.log("📝 以下のMCPサーバーは環境変数が不足しているためスキップされました:");
    skippedServers.forEach(server => {
      console.log(`  - ${server.name}`);
    });
    console.log("");
  }

  const upsertPromises = serversToUpsert.map((serverData) => {
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

  console.log("✅ MCPサーバーが正常に登録されました:");
  console.log(`  登録されたMCPサーバー数: ${upsertedMcpServers.length}`);
  console.log(
    "  登録されたMCPサーバー:",
    upsertedMcpServers.map((server) => server.name).join(", "),
  );
};
