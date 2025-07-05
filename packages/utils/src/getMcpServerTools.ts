import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * MCPサーバーからツール一覧を取得する
 * @param server MCPサーバー
 * @returns ツール一覧
 */
export const getMcpServerTools = async (
  server: McpServer,
  envVars: Record<string, string>,
): Promise<Tool[]> => {
  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    let transport;
    if (server.transportType === "STDIO") {
      transport = new StdioClientTransport({
        command:
          server.command === "node" ? process.execPath : (server.command ?? ""),
        args: server.args,
        env: envVars,
      });
    } else {
      transport = new SSEClientTransport(new URL(server.url ?? ""), {
        requestInit: { headers: envVars },
      });
    }

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

/**
 * MCPサーバーからツール一覧を取得する（SSE版）
 * @param server MCPサーバー
 * @param envVars 環境変数（ヘッダーとして使用）
 * @returns ツール一覧
 */
export const getMcpServerToolsSSE = async (
  server: Pick<McpServer, "name" | "url">,
  envVars: Record<string, string>,
): Promise<Tool[]> => {
  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    // SSETransportのみを使用
    const transport = new SSEClientTransport(new URL(server.url ?? ""), {
      requestInit: { headers: envVars },
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
