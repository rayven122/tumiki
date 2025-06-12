import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import "@suekou/mcp-notion-server";

/**
 * MCPサーバーからツール一覧を取得する
 * @param server MCPサーバー
 * @returns ツール一覧
 */
export const getMcpServerTools = async (
  server: Pick<McpServer, "name" | "command" | "args">,
  envVars: Record<string, string>,
): Promise<Tool[]> => {
  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    // トランスポートの設定
    const transport = new StdioClientTransport({
      command: server.command === "node" ? process.execPath : server.command,
      args: server.args,
      env: envVars,
    });

    // サーバーに接続
    await client.connect(transport);

    // ツール一覧を取得
    const listTools = await client.listTools();

    // サーバーの接続を閉じる
    await client.close();

    return listTools.tools;
  } catch (error) {
    console.error(error);
    return [];
  }
};
