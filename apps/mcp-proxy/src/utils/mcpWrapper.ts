/**
 * MCP クライアントライフサイクル管理ラッパー
 *
 * 接続作成→操作実行→クリーンアップのパターンを一元化
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMcpClient } from "../services/mcpClient.js";
import type { RemoteMcpServerConfig } from "../config/mcpServers.js";

/**
 * MCP クライアントを使用した操作を安全に実行
 *
 * クライアントの作成、操作実行、クリーンアップを自動的に処理
 *
 * @param namespace サーバーの名前空間
 * @param config Remote MCPサーバー設定
 * @param operation クライアントを使用した操作
 * @returns 操作の結果
 */
export const withMcpClient = async <T>(
  namespace: string,
  config: RemoteMcpServerConfig,
  operation: (client: Client) => Promise<T>,
): Promise<T> => {
  let client: Client | undefined;

  try {
    const { client: mcpClient } = await createMcpClient(namespace, config);
    client = mcpClient;

    const result = await operation(client);

    await client.close();

    return result;
  } catch (error) {
    if (client) {
      await client.close().catch(() => {
        // クリーンアップエラーは無視
      });
    }
    throw error;
  }
};
