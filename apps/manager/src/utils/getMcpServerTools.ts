import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * MCPサーバーからツール一覧を取得する（SSE版）
 * @param server MCPサーバー情報（name と url）
 * @param envVars 環境変数（ヘッダーとして使用）
 * @returns ツール一覧
 */
export const getMcpServerToolsSSE = async (
  server: { name: string; url: string },
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

    // 10秒のタイムアウトを設定
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("MCPサーバーへの接続がタイムアウトしました（10秒）"));
      }, 10000);
    });

    // サーバーに接続（タイムアウト付き）
    await Promise.race([client.connect(transport), timeoutPromise]);

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
 * MCPサーバーからツール一覧を取得する（HTTP版）
 * @param server MCPサーバー情報（name と url）
 * @param headers HTTPヘッダー
 * @returns ツール一覧
 */
export const getMcpServerToolsHTTP = async (
  server: { name: string; url: string },
  headers: Record<string, string>,
): Promise<Tool[]> => {
  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    // StreamableHTTPClientTransportを使用（requestInitでヘッダーを設定）
    const transport = new StreamableHTTPClientTransport(
      new URL(server.url ?? ""),
      {
        requestInit: {
          headers: {
            ...headers,
            // Context7サーバーが要求するヘッダーを明示的に設定
            Accept: "application/json, text/event-stream",
            "Content-Type": "application/json",
          },
        },
      },
    );

    // 10秒のタイムアウトを設定
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("MCPサーバーへの接続がタイムアウトしました（10秒）"));
      }, 10000);
    });

    // サーバーに接続（タイムアウト付き）
    await Promise.race([client.connect(transport), timeoutPromise]);

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
