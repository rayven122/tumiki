import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { logger } from "../../libs/logger.js";
import type { ServerConfig } from "../../libs/types.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  setupGoogleCredentialsEnv,
  type GoogleCredentials,
} from "@tumiki/utils/server/security";
import { CompatibilityCallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { MCPConnection, MCPConnectionOptions } from "./types.js";

/**
 * URLにx-api-keyをクエリパラメータとして追加する
 */
const addApiKeyToUrl = (
  url: string,
  headers: Record<string, string>,
): string => {
  const urlObj = new URL(url);

  // x-api-keyヘッダーがある場合、クエリパラメータとして追加
  if (headers["X-API-Key"]) {
    urlObj.searchParams.set("x-api-key", headers["X-API-Key"]);
  }

  // Authorizationヘッダーがある場合
  if (headers.Authorization) {
    urlObj.searchParams.set("authorization", headers.Authorization);
  }

  // 他の認証関連ヘッダーも同様に処理
  for (const [key, value] of Object.entries(headers)) {
    if (
      key.toLowerCase().includes("bearer") ||
      key.toLowerCase().includes("token")
    ) {
      urlObj.searchParams.set(key.toLowerCase(), value);
    }
  }

  return urlObj.toString();
};

/**
 * URL内のプレースホルダーを実際の値で置換する
 */
const replaceUrlPlaceholders = (
  url: string,
  placeholders: Record<string, string>,
): string => {
  let replacedUrl = url;
  for (const [key, value] of Object.entries(placeholders)) {
    replacedUrl = replacedUrl.replace(`{${key}}`, value);
  }
  return replacedUrl;
};

/**
 * MCP接続を作成
 *
 * @param client - MCPクライアント
 * @param transport - トランスポート
 * @param options - 接続オプション
 * @param credentialsCleanup - 認証情報クリーンアップ関数
 * @returns MCP接続
 */
export const createMCPConnection = (
  client: Client,
  transport: Transport,
  options: MCPConnectionOptions,
  credentialsCleanup?: () => Promise<void>,
): MCPConnection => {
  return {
    client,
    transport,
    lastUsed: Date.now(),
    isActive: false,
    serverName: options.serverName,
    userServerConfigInstanceId: options.userServerConfigInstanceId,
    credentialsCleanup,
  };
};

/**
 * 接続のヘルスチェックを実行（簡素化版）
 *
 * @param connection - チェック対象の接続
 * @returns 接続が健全な場合true
 */
export const healthCheck = async (
  connection: MCPConnection,
): Promise<boolean> => {
  try {
    await connection.client.request(
      { method: "tools/list", params: {} },
      CompatibilityCallToolResultSchema,
    );
    return true;
  } catch (error) {
    logger.debug("Health check failed", {
      serverName: connection.serverName,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

/**
 * 接続をアクティブ状態にマーク
 *
 * @param connection - 対象の接続
 */
export const markAsActive = (connection: MCPConnection): void => {
  connection.isActive = true;
  connection.lastUsed = Date.now();
};

/**
 * 接続を非アクティブ状態にマーク
 *
 * @param connection - 対象の接続
 */
export const markAsInactive = (connection: MCPConnection): void => {
  connection.isActive = false;
  connection.lastUsed = Date.now();
};

/**
 * 接続を安全に閉じる
 *
 * @param connection - 閉じる接続
 */
export const closeConnection = async (
  connection: MCPConnection,
): Promise<void> => {
  try {
    // 順序重要：client → transport → credentials の順でクリーンアップ
    await Promise.allSettled([
      connection.client?.close(),
      connection.transport?.close(),
      connection.credentialsCleanup?.(),
    ]);
  } catch (error) {
    // クリーンアップエラーは警告レベル（致命的でない）
    logger.warn("Connection cleanup warning", {
      serverName: connection.serverName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * MCPクライアントとトランスポートを作成
 *
 * @param serverConfig - サーバー設定
 * @param options - 接続オプション (Instance ID など)
 * @returns クライアント、トランスポート、クリーンアップ関数
 */
export const createMCPClient = async (
  serverConfig: ServerConfig,
  options?: MCPConnectionOptions,
): Promise<{
  client: Client | undefined;
  transport: Transport | undefined;
  credentialsCleanup?: () => Promise<void>;
}> => {
  let transport: Transport | null = null;
  let credentialsCleanup: (() => Promise<void>) | undefined;

  try {
    if (serverConfig.transport.type === "sse") {
      const sseTransport = serverConfig.transport;
      if ("url" in sseTransport && typeof sseTransport.url === "string") {
        // URL内のプレースホルダーを置換
        let processedUrl = sseTransport.url;
        if (options?.userServerConfigInstanceId) {
          processedUrl = replaceUrlPlaceholders(processedUrl, {
            instanceId: options.userServerConfigInstanceId,
          });
        }

        // envVarsからx-api-keyヘッダーを取得してURLに追加
        const headers: Record<string, string> = {};
        if (sseTransport.env && typeof sseTransport.env === "object") {
          const envVars = sseTransport.env;
          // x-api-keyヘッダーの設定
          if (envVars["X-API-KEY"]) {
            headers["X-API-Key"] = envVars["X-API-KEY"];
          }
          // 他の認証ヘッダーも同様に処理
          for (const [key, value] of Object.entries(envVars)) {
            if (
              key.toLowerCase().includes("authorization") ||
              key.toLowerCase().includes("bearer") ||
              key.toLowerCase().includes("token")
            ) {
              headers[key] = value;
            }
          }
        }

        // 認証情報をクエリパラメータとしてURLに追加
        const finalUrl = addApiKeyToUrl(processedUrl, headers);
        transport = new SSEClientTransport(new URL(finalUrl));
      } else {
        throw new Error("SSE transport requires a valid URL");
      }
    } else {
      let finalEnv = serverConfig.transport.env
        ? Object.fromEntries(
            Object.entries(serverConfig.transport.env).map(([key, value]) => [
              key,
              String(value),
            ]),
          )
        : {};

      // Google認証情報の処理
      if (serverConfig.googleCredentials) {
        const { envVars, cleanup } = await setupGoogleCredentialsEnv(
          finalEnv,
          serverConfig.googleCredentials as GoogleCredentials,
        );
        finalEnv = envVars;
        credentialsCleanup = cleanup;
      }

      transport = new StdioClientTransport({
        command: serverConfig.transport.command,
        args: serverConfig.transport.args,
        env: finalEnv,
      });
    }
  } catch {
    return { transport: undefined, client: undefined, credentialsCleanup };
  }

  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  return { client, transport, credentialsCleanup };
};

/**
 * 新しいMCP接続を作成して接続を確立
 *
 * @param serverConfig - サーバー設定
 * @param options - 接続オプション
 * @returns 作成された接続
 * @throws 接続作成に失敗した場合
 */
export const createConnection = async (
  serverConfig: ServerConfig,
  options: MCPConnectionOptions,
): Promise<MCPConnection> => {
  const { client, transport, credentialsCleanup } = await createMCPClient(
    serverConfig,
    options,
  );

  if (!client || !transport) {
    throw new Error("Failed to create client or transport");
  }

  await client.connect(transport);
  return createMCPConnection(client, transport, options, credentialsCleanup);
};
