import { db } from "@tumiki/db";
import { getMcpServerTools } from "@tumiki/utils";

import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * MCP サーバーからツールを取得してデータベースに書き込む
 */
export const upsertMcpTools = async () => {
  const mcpServers = await db.mcpServer.findMany();
  const filteredMcpServers = mcpServers.filter((mcpServer) =>
    MCP_SERVERS.some((server) => server.name === mcpServer.name),
  );

  for (const mcpServer of filteredMcpServers) {
    // 環境変数を取得
    const envVars = mcpServer.envVars.reduce<Record<string, string>>(
      (acc, envVar) => {
        acc[envVar] = process.env[envVar] ?? "";
        return acc;
      },
      {},
    );
    // ツール一覧を取得
    const tools = await getMcpServerTools(mcpServer, envVars);

    const upsertPromises = tools.map((tool) => {
      return db.tool.upsert({
        where: {
          mcpServerId_name: {
            mcpServerId: mcpServer.id,
            name: tool.name,
          },
        },
        update: {
          description: tool.description,
          inputSchema: tool.inputSchema as object,
        },
        create: {
          mcpServerId: mcpServer.id,
          name: tool.name,
          description: tool.description ?? "",
          inputSchema: tool.inputSchema as object,
        },
      });
    });

    // データベースにツールを書き込む
    const upsertedTools = await db.$transaction(upsertPromises);

    console.log(`${mcpServer.name} のツールが正常に登録されました`);
    console.log(`登録されたツール数: ${upsertedTools.length}`);
    console.log(
      `ツールの詳細:`,
      upsertedTools.map((tool) => tool.name),
    );
  }
};
