import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GoogleAuth } from "google-auth-library";

import type { McpServer } from "@tumiki/db/server";

/**
 * Cloud Run認証用のIDトークンを取得する
 * @param targetAudience Cloud RunサービスのURL
 * @returns IDトークン
 */
const getCloudRunIdToken = async (targetAudience: string): Promise<string> => {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(targetAudience);
  const headers = await client.getRequestHeaders();

  const authHeader =
    headers.get("Authorization") ?? headers.get("authorization");
  const idToken = authHeader?.replace("Bearer ", "");

  if (!idToken) {
    throw new Error("Failed to get Cloud Run ID token");
  }

  return idToken;
};

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
    } else if (server.transportType === "STREAMABLE_HTTPS") {
      // Streamable HTTPS サーバーの場合
      const headers: Record<string, string> = {};

      // Cloud Run（authType === "CLOUD_RUN_IAM"）の場合のみ、IAM認証トークンを取得
      if (server.authType === "CLOUD_RUN_IAM") {
        try {
          // Cloud RunサービスのベースURLをオーディエンスとして使用
          const serviceUrl = new URL(server.url ?? "");
          const targetAudience = `${serviceUrl.protocol}//${serviceUrl.host}`;

          const idToken = await getCloudRunIdToken(targetAudience);
          headers.Authorization = `Bearer ${idToken}`;
        } catch (error) {
          console.warn(
            `Warning: Failed to get Cloud Run ID token for ${server.name}:`,
            error instanceof Error ? error.message : error,
          );
          console.warn(
            "Continuing without Cloud Run authentication. Ensure gcloud auth application-default login is configured.",
          );
        }
      }

      // envVarsを全てカスタムヘッダーとして追加
      for (const [key, value] of Object.entries(envVars)) {
        headers[key] = value;
      }

      transport = new StreamableHTTPClientTransport(new URL(server.url ?? ""), {
        requestInit: { headers },
      });
    } else {
      // SSE transport for backward compatibility
      transport = new SSEClientTransport(new URL(server.url ?? ""), {
        requestInit: { headers: envVars },
      });
    }

    // 10秒のタイムアウトを設定（リモートサーバーの場合）
    if (server.transportType !== "STDIO") {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error("MCPサーバーへの接続がタイムアウトしました（10秒）"),
          );
        }, 10000);
      });

      // サーバーに接続（タイムアウト付き）
      await Promise.race([client.connect(transport), timeoutPromise]);
    } else {
      // サーバーに接続
      await client.connect(transport);
    }

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
 * @param server MCPサーバー
 * @param headers HTTPヘッダー
 * @returns ツール一覧
 */
export const getMcpServerToolsHTTP = async (
  server: Pick<McpServer, "name" | "url">,
  headers: Record<string, string>,
): Promise<Tool[]> => {
  // MCPクライアントの初期化
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    // StreamableHTTPClientTransportを使用
    const transport = new StreamableHTTPClientTransport(
      new URL(server.url ?? ""),
      { requestInit: { headers } },
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
