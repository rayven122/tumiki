import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { db } from "@/server/db";
import type { McpServer } from "@prisma/client";

/**
 * MCPサーバーからツール一覧を取得する
 * @param server MCPサーバー
 * @returns ツール一覧
 */
const getMcpServerTools = async (server: McpServer) => {
  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    // トランスポートの設定
    const transport = new StdioClientTransport({
      command: "node",
      args: server.args,
      env: server.envVars.reduce<Record<string, string>>((acc, envVar) => {
        acc[envVar] = process.env[envVar] ?? "";
        return acc;
      }, {}),
    });

    // サーバーに接続
    await client.connect(transport);

    // ツール一覧を取得
    const listTools = await client.listTools();
    return listTools.tools;
  } catch (error) {
    console.error(error);
    return [];
  }
};

/**
 * MCP サーバーからツールを取得してデータベースに書き込む
 */
export const upsertMcpTools = async () => {
  const mcpServers = await db.mcpServer.findMany();
  for (const mcpServer of mcpServers) {
    // ツール一覧を取得
    const tools = await getMcpServerTools(mcpServer);

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
