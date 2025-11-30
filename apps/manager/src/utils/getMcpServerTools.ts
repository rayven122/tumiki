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
    console.log("[getMcpServerToolsSSE] 接続開始:", {
      serverName: server.name,
      serverUrl: server.url,
      hasAuthHeader: !!envVars.Authorization,
    });

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
    console.log("[getMcpServerToolsSSE] 接続成功");

    // ツール一覧を取得
    const listTools = await client.listTools();
    console.log(
      `[getMcpServerToolsSSE] ツール取得成功: ${listTools.tools.length}個`,
    );

    // サーバーの接続を閉じる
    await client.close();

    return listTools.tools;
  } catch (error) {
    console.error("[getMcpServerToolsSSE] エラー発生:", {
      serverName: server.name,
      serverUrl: server.url,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    const finalHeaders = {
      ...headers,
      // Context7サーバーが要求するヘッダーを明示的に設定
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };

    console.log("[getMcpServerToolsHTTP] 接続開始:", {
      serverName: server.name,
      serverUrl: server.url,
      headers: finalHeaders,
      hasAuthHeader: !!headers.Authorization,
    });

    // StreamableHTTPClientTransportを使用（requestInitでヘッダーを設定）
    const transport = new StreamableHTTPClientTransport(
      new URL(server.url ?? ""),
      {
        requestInit: {
          headers: finalHeaders,
        },
      },
    );

    // 10秒のタイムアウトを設定
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("MCPサーバーへの接続がタイムアウトしました（10秒）"));
      }, 10000);
    });

    console.log("[getMcpServerToolsHTTP] 接続試行中...");
    // サーバーに接続（タイムアウト付き）
    await Promise.race([client.connect(transport), timeoutPromise]);
    console.log("[getMcpServerToolsHTTP] 接続成功");

    console.log("[getMcpServerToolsHTTP] ツールリスト取得試行中...");
    // ツール一覧を取得
    const listTools = await client.listTools();
    console.log(
      `[getMcpServerToolsHTTP] ツール取得成功: ${listTools.tools.length}個`,
      listTools.tools.map((t) => t.name),
    );

    // サーバーの接続を閉じる
    await client.close();
    console.log("[getMcpServerToolsHTTP] 接続をクローズしました");

    return listTools.tools;
  } catch (error) {
    console.error("[getMcpServerToolsHTTP] エラー発生:", {
      serverName: server.name,
      serverUrl: server.url,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
};
