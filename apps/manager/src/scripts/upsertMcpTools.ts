import { db } from "@tumiki/db/client";
import { getMcpServerTools } from "@/utils/server/getMcpServerTools";

/**
 * MCP サーバーからツールを取得してデータベースに書き込む
 */
export const upsertMcpTools = async () => {
  const mcpServers = await db.mcpServer.findMany();
  for (const mcpServer of mcpServers) {
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
    console.log(JSON.stringify(upsertedTools, null, 2));
  }
};
