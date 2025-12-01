// TODO: このファイルの機能を @tumiki/mcp-utils パッケージとして分離する
// - getMcpServerTools, getMcpServerToolsSSE, getMcpServerToolsHTTP を移動
// - Cloud Run IAM 認証機能を含める
// - apps/manager や他のパッケージから共通で利用できるようにする

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GoogleAuth } from "google-auth-library";

import type { McpServerTemplate } from "@tumiki/db/server";

/**
 * Cloud Run認証用のIDトークンを取得する
 * @param targetAudience Cloud RunサービスのURL（オーディエンス）
 * @returns IDトークン
 */
const getCloudRunIdToken = async (targetAudience: string): Promise<string> => {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  // IDトークンクライアントを取得（targetAudienceをオーディエンスとして指定）
  const client = await auth.getIdTokenClient(targetAudience);

  // idTokenProviderから直接IDトークンを取得
  const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);

  if (!idToken) {
    throw new Error("Failed to obtain ID token: token is empty");
  }

  return idToken;
};

/**
 * SSE トランスポートでツール一覧を取得する（内部関数）
 * @param server MCPサーバーテンプレート
 * @param envVars 環境変数（ヘッダーとして使用）
 * @returns ツール一覧
 */
const getToolsWithSSE = async (
  server: Pick<McpServerTemplate, "name" | "url">,
  envVars: Record<string, string>,
): Promise<Tool[]> => {
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    const transport = new SSEClientTransport(new URL(server.url ?? ""), {
      requestInit: {
        headers: {
          ...envVars,
          Accept: "application/json, text/event-stream",
        },
      },
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
 * Streamable HTTPS トランスポートでツール一覧を取得する（内部関数）
 * @param server MCPサーバーテンプレート
 * @param envVars 環境変数
 * @param useCloudRunIam Cloud Run IAM認証を使用するか
 * @returns ツール一覧
 */
const getToolsWithStreamableHTTPS = async (
  server: Pick<McpServerTemplate, "name" | "url">,
  envVars: Record<string, string>,
  useCloudRunIam: boolean,
): Promise<Tool[]> => {
  const client = new Client({
    name: server.name,
    version: "1.0.0",
  });

  try {
    const headers: Record<string, string> = {};

    // Cloud Run（useCloudRunIam === true）の場合のみ、IAM認証トークンを取得
    if (useCloudRunIam) {
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

    // Acceptヘッダーを追加
    headers.Accept = "application/json, text/event-stream";

    const transport = new StreamableHTTPClientTransport(
      new URL(server.url ?? ""),
      {
        requestInit: { headers },
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

/**
 * MCPサーバーテンプレートからツール一覧を取得する
 * @param server MCPサーバーテンプレート
 * @param envVars 環境変数
 * @returns ツール一覧
 */
export const getMcpServerTools = async (
  server: McpServerTemplate,
  envVars: Record<string, string>,
): Promise<Tool[]> => {
  switch (server.transportType) {
    case "SSE":
      return getToolsWithSSE(server, envVars);
    case "STREAMABLE_HTTPS":
      return getToolsWithStreamableHTTPS(
        server,
        envVars,
        server.useCloudRunIam,
      );
    default:
      console.error(
        `Unsupported transport type: ${server.transportType as string}`,
      );
      return [];
  }
};
