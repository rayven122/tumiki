/**
 * @fileoverview MCPクライアント作成ユーティリティ
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { setupGoogleCredentialsEnv } from "./googleCredentials.js";
import { createCloudRunHeaders } from "./cloudRunAuth.js";
import type { ServerConfig } from "../libs/types.js";
import { recordError } from "../libs/metrics.js";

/**
 * MCPサーバーに接続するクライアントを作成
 */
export const createMCPClient = async (
  server: ServerConfig,
): Promise<{
  client: Client | undefined;
  transport: Transport | undefined;
  credentialsCleanup?: () => Promise<void>;
}> => {
  let transport: Transport | null = null;
  let credentialsCleanup: (() => Promise<void>) | undefined;

  try {
    if (server.transport.type === "sse") {
      // SSEトランスポート
      const sseTransport = server.transport;
      if ("url" in sseTransport && typeof sseTransport.url === "string") {
        transport = new SSEClientTransport(new URL(sseTransport.url));
      } else {
        throw new Error("SSE transport requires a valid URL");
      }
    } else if (server.transport.type === "streamable_https") {
      // Streamable HTTPSトランスポート（Cloud Run対応）
      const streamableTransport = server.transport;
      if (
        "url" in streamableTransport &&
        typeof streamableTransport.url === "string"
      ) {
        const url = new URL(streamableTransport.url);

        // Cloud Run IAM認証が必要な場合、認証ヘッダーを作成
        const customHeaders: Record<string, string> = {};

        if (streamableTransport.requireCloudRunAuth) {
          const authHeaders = await createCloudRunHeaders();
          Object.assign(customHeaders, authHeaders);
        }

        // 環境変数からHTTPヘッダーを設定（APIキーなど）
        if (streamableTransport.env) {
          Object.entries(streamableTransport.env).forEach(
            ([headerName, value]) => {
              customHeaders[headerName] = value;
            },
          );
        }

        // カスタムfetch関数を使用してヘッダーを追加
        const customFetch: typeof fetch = async (input, init) => {
          const mergedHeaders = {
            ...customHeaders,
            ...(init?.headers as Record<string, string>),
          };

          return fetch(input, {
            ...init,
            headers: mergedHeaders,
          });
        };

        transport = new StreamableHTTPClientTransport(url, {
          fetch: customFetch,
        });
      } else {
        throw new Error("Streamable HTTPS transport requires a valid URL");
      }
    } else {
      // Stdioトランスポート
      let finalEnv = server.transport.env
        ? Object.fromEntries(
            Object.entries(server.transport.env).map(([key, value]) => [
              key,
              String(value),
            ]),
          )
        : {};

      // Google認証情報の処理
      if (server.googleCredentials) {
        const result = await setupGoogleCredentialsEnv(
          finalEnv,
          server.googleCredentials,
        );
        finalEnv = result.envVars;
        credentialsCleanup = result.cleanup;
      }

      transport = new StdioClientTransport({
        command: server.transport.command,
        args: server.transport.args,
        env: finalEnv,
      });
    }
  } catch (error) {
    recordError("transport_creation_failed");
    console.error("Failed to create transport:", error);
    return { transport: undefined, client: undefined, credentialsCleanup };
  }

  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  return { client, transport, credentialsCleanup };
};
