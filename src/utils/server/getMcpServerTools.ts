import { db } from "@/server/db";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpServer } from "@prisma/client";

/**
 * MCPサーバーからツール一覧を取得する
 * @param server MCPサーバー
 * @returns ツール一覧
 */
export const getMcpServerTools = async (
  server: Pick<McpServer, "name" | "command" | "args">,
  envVars: Record<string, string>,
) => {
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

export const callTool = async () => {
  const userMcpServer = await db.userMcpServer.findUnique({
    where: {
      id: "cma9pmltm0001o0gy0igld48b",
    },
    include: {
      mcpServer: true,
    },
  });

  if (!userMcpServer) {
    throw new Error("User MCP server not found");
  }

  const server = userMcpServer.mcpServer;

  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  console.log(JSON.parse(userMcpServer.envVars));
  try {
    // トランスポートの設定
    const transport = new StdioClientTransport({
      command: server.command === "node" ? process.execPath : server.command,
      args: server.args,
      env:
        userMcpServer.envVars !== ""
          ? (JSON.parse(userMcpServer.envVars) as Record<string, string>)
          : undefined,
    });

    // サーバーに接続
    await client.connect(transport);

    const listTools = await client.listTools();
    const tool = listTools.tools.find((tool) => tool.name === "notion_search");

    if (!tool) {
      throw new Error("Tool not found");
    }
    console.log(tool.inputSchema);

    const result = await client.callTool({
      name: "notion_search",
      arguments: {
        page_size: 1,
        query: "",
      },
    });

    console.log(result);
    // サーバーの接続を閉じる
    await client.close();

    return result;
  } catch (error) {
    console.error(error);
    return [];
  }
};
