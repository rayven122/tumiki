import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { db } from "@/server/db";

/**
 * MCP サーバーからツールを取得してデータベースに書き込む
 */
const addMcpTools = async () => {
  const mcpServers = await db.mcpServer.findMany();
  for (const server of mcpServers) {
    try {
      // MCPクライアントの初期化
      const client = new Client({
        name: server.name,
        version: "1.0.0",
      });

      // トランスポートの設定
      const transport = new StdioClientTransport({
        command: "node",
        args: server.args,
        env: server.envVars.reduce(
          (acc, envVar) => {
            acc[envVar] = process.env[envVar] ?? "";
            return acc;
          },
          {} as Record<string, string>,
        ),
      });

      // サーバーに接続
      await client.connect(transport);

      // ツール一覧を取得
      const listTools = await client.listTools();

      // データベースにツールを書き込む
      for (const tool of listTools.tools) {
        await db.tool.upsert({
          where: {
            mcpServerId_name: {
              mcpServerId: server.id,
              name: tool.name,
            },
          },
          update: {
            description: tool.description,
            inputSchema: (tool.inputSchema as object) ?? {},
            isEnabled: true,
          },
          create: {
            name: tool.name,
            description: tool.description ?? "",
            inputSchema: (tool.inputSchema as object) ?? {},
            isEnabled: true,
            mcpServerId: server.name,
          },
        });
      }

      console.log(`${server.name} のツールが正常に登録されました`);
    } catch (error) {
      console.error(
        `${server.name} のツール登録中にエラーが発生しました:`,
        error,
      );
    }
  }
};

try {
  await addMcpTools();
} catch (error) {
  console.error(error);
} finally {
  await db.$disconnect();
  process.exit(0);
}
