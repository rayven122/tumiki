/**
 * MCP クライアントライフサイクル管理ラッパー
 *
 * 接続作成→操作実行→クリーンアップのパターンを一元化
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMcpClient } from "./client.js";
import type { RemoteMcpServerConfig } from "../../server/config.js";

/**
 * タイムアウト付きPromise実行
 *
 * 指定時間内にPromiseが完了しない場合、タイムアウトエラーを投げる
 *
 * @param promise 実行するPromise
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @param operationName 操作名（エラーメッセージ用）
 * @returns Promiseの結果
 */
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Operation "${operationName}" timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
};

/**
 * MCP クライアントを使用した操作を安全に実行
 *
 * クライアントの作成、操作実行、クリーンアップを自動的に処理
 * デフォルトで2分のタイムアウトを設定し、ランナウェイコストを防止
 *
 * @param namespace サーバーの名前空間
 * @param config Remote MCPサーバー設定
 * @param operation クライアントを使用した操作
 * @param timeoutMs タイムアウト時間（ミリ秒）デフォルト: 120000
 * @returns 操作の結果
 */
export const withMcpClient = async <T>(
  namespace: string,
  config: RemoteMcpServerConfig,
  operation: (client: Client) => Promise<T>,
  timeoutMs = 120000,
): Promise<T> => {
  let client: Client | undefined;

  try {
    // クライアント作成にタイムアウト保護を適用
    const { client: mcpClient } = await withTimeout(
      createMcpClient(namespace, config),
      timeoutMs,
      `MCP client creation for ${namespace}`,
    );
    client = mcpClient;

    // 操作実行にタイムアウト保護を適用
    const result = await withTimeout(
      operation(client),
      timeoutMs,
      `MCP operation for ${namespace}`,
    );

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
