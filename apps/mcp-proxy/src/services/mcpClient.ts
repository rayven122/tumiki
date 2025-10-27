/**
 * @fileoverview シンプルなRemote MCPクライアント作成
 *
 * プール管理なし、リクエストごとに接続を作成・破棄
 * Cloud Runステートレス環境に最適化
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { RemoteMcpServerConfig } from "../config/mcpServers.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * Remote MCPサーバーに接続するクライアントを作成
 *
 * @param namespace サーバーの名前空間
 * @param config Remote MCPサーバー設定
 * @returns クライアントとトランスポート
 */
export const createMcpClient = async (
  namespace: string,
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
    // 注意: MCP SDKのSSEClientTransportは現在カスタムヘッダーをサポートしていません
    const headers: Record<string, string> = {};

    if (config.authType === "bearer" && config.authToken) {
      headers.Authorization = `Bearer ${config.authToken}`;
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
        `Authentication headers specified for ${namespace}, but SSEClientTransport does not support custom headers yet.`,
      );
    }

    // SSEClientTransportの作成
    transport = new SSEClientTransport(url);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create transport for ${namespace}: ${errorMessage}`,
    );
  }

  // クライアントの作成
  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  try {
    logInfo("Creating MCP connection", { namespace });

    // トランスポートに接続
    await client.connect(transport);

    logInfo("MCP connection created successfully", { namespace });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(
      `Failed to connect to Remote MCP server ${namespace}`,
      error as Error,
    );
    throw new Error(
      `Failed to connect to Remote MCP server ${namespace}: ${errorMessage}`,
    );
  }

  return { client, transport };
};
