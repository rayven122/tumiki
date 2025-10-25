/**
 * @fileoverview MCPクライアント作成ユーティリティ
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { setupGoogleCredentialsEnv } from "@tumiki/utils/server/security";
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
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
        const result: {
          envVars: Record<string, string>;
          cleanup: () => Promise<void>;
        } = await setupGoogleCredentialsEnv(finalEnv, server.googleCredentials);
        finalEnv = result.envVars;
        credentialsCleanup = result.cleanup;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
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
