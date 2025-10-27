/**
 * @fileoverview Remote MCPクライアント作成ユーティリティ
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { RemoteMcpServerConfig } from "../config/mcpServers.js";

/**
 * Remote MCPサーバーに接続するクライアントを作成
 *
 * @param config Remote MCPサーバー設定
 * @returns クライアントとトランスポート
 */
export const createRemoteMcpClient = async (
  config: RemoteMcpServerConfig,
): Promise<{
  client: Client;
  transport: Transport;
}> => {
  let transport: Transport;

  try {
    // SSEトランスポートを使用してRemote MCPサーバーに接続
    const url = new URL(config.url);

    // 認証ヘッダーの設定
    // TODO: MCP SDKのSSEClientTransportは現在カスタムヘッダーをサポートしていません
    // 認証が必要な場合は、URLパラメータまたは別のトランスポート実装を検討する必要があります
    const headers: Record<string, string> = {};

    if (config.authType === "bearer" && config.authToken) {
      headers["Authorization"] = `Bearer ${config.authToken}`;
    } else if (config.authType === "api_key" && config.authToken) {
      headers["X-API-Key"] = config.authToken;
    }

    // カスタムヘッダーの追加
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    // ヘッダーが設定されている場合は警告を表示
    if (Object.keys(headers).length > 0) {
      console.warn(
        `Authentication headers specified for ${config.namespace}, but SSEClientTransport does not support custom headers yet. Consider using URL-based authentication or implementing a custom transport.`,
      );
    }

    // SSEClientTransportの作成（現在はヘッダーなし）
    transport = new SSEClientTransport(url);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create transport for ${config.namespace}: ${errorMessage}`,
    );
  }

  // クライアントの作成
  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  try {
    // トランスポートに接続
    await client.connect(transport);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to connect to Remote MCP server ${config.namespace}: ${errorMessage}`,
    );
  }

  return { client, transport };
};
