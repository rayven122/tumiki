import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GoogleAuth } from "google-auth-library";

/**
 * Cloud Run認証用のIDトークンを取得する
 * @param targetAudience Cloud RunサービスのURL（オーディエンス）
 * @returns IDトークン
 */
const getCloudRunIdToken = async (targetAudience: string): Promise<string> => {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(targetAudience);
  const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);

  if (!idToken) {
    throw new Error("Failed to obtain ID token: token is empty");
  }

  return idToken;
};

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
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    const transport = new SSEClientTransport(new URL(server.url ?? ""), {
      requestInit: { headers: envVars },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("MCPサーバーへの接続がタイムアウトしました（10秒）"));
      }, 10000);
    });

    await Promise.race([client.connect(transport), timeoutPromise]);
    const listTools = await client.listTools();
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
 * @param useCloudRunIam Cloud Run IAM認証を使用するか
 * @returns ツール一覧
 */
export const getMcpServerToolsHTTP = async (
  server: { name: string; url: string },
  headers: Record<string, string>,
  useCloudRunIam = false,
): Promise<Tool[]> => {
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    const finalHeaders: Record<string, string> = {
      ...headers,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };

    // Cloud Run IAM認証が必要な場合、IDトークンを取得
    if (useCloudRunIam) {
      const serviceUrl = new URL(server.url ?? "");
      const targetAudience = `${serviceUrl.protocol}//${serviceUrl.host}`;

      console.log(
        `[getMcpServerToolsHTTP] Cloud Run IAM認証を開始 (${server.name}):`,
        { targetAudience },
      );

      try {
        const idToken = await getCloudRunIdToken(targetAudience);
        finalHeaders.Authorization = `Bearer ${idToken}`;
        console.log(
          `[getMcpServerToolsHTTP] Cloud Run IAMトークン取得成功 (${server.name})`,
        );
      } catch (error) {
        console.error(
          `[getMcpServerToolsHTTP] Cloud Run IAMトークン取得エラー (${server.name}):`,
          error instanceof Error ? error.message : error,
        );
        // Cloud Run IAM認証が必要な場合、トークン取得失敗はエラーとして扱う
        throw new Error(
          `Cloud Run IAM認証に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const transport = new StreamableHTTPClientTransport(
      new URL(server.url ?? ""),
      {
        requestInit: {
          headers: finalHeaders,
        },
      },
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("MCPサーバーへの接続がタイムアウトしました（10秒）"));
      }, 10000);
    });

    await Promise.race([client.connect(transport), timeoutPromise]);
    const listTools = await client.listTools();
    await client.close();

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
