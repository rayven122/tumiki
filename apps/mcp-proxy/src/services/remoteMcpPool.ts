/**
 * @fileoverview Remote MCP接続プール管理
 *
 * Cloud Run対応のステートレス接続プール実装
 * - 名前空間ごとの接続管理
 * - アイドル接続の自動クリーンアップ
 * - ヘルスチェック機能
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { createRemoteMcpClient } from "../utils/createRemoteMcpClient.js";
import { getEnabledServers } from "../config/mcpServers.js";
import type { PoolStats } from "../types/index.js";
import { McpLogger } from "./mcpLogger.js";

const logger = new McpLogger();

/**
 * MCP接続情報
 */
type MCPConnection = {
  client: Client;
  lastUsed: number;
  isActive: boolean;
  namespace: string;
};

/**
 * Remote MCP接続プール
 */
class RemoteMcpPool {
  private readonly pools = new Map<string, MCPConnection>();
  private readonly MAX_IDLE_TIME = Number(process.env.MAX_IDLE_TIME) || 300000; // 5分
  private readonly CONNECTION_TIMEOUT =
    Number(process.env.CONNECTION_TIMEOUT) || 30000; // 30秒
  private readonly HEALTH_CHECK_INTERVAL =
    Number(process.env.HEALTH_CHECK_INTERVAL) || 60000; // 1分
  private cleanupTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  /**
   * 接続を取得（既存または新規作成）
   */
  async getConnection(namespace: string): Promise<Client> {
    const connection = this.pools.get(namespace);

    // クリーンアップタイマーを開始（初回のみ）
    if (!this.cleanupTimer) {
      this.startCleanupTimer();
    }

    // 既存の接続が利用可能かチェック
    if (connection) {
      const now = Date.now();
      if (
        !connection.isActive &&
        now - connection.lastUsed < this.MAX_IDLE_TIME
      ) {
        // 既存接続を再利用
        connection.isActive = true;
        connection.lastUsed = now;
        logger.logInfo("Reusing existing MCP connection", { namespace });
        return connection.client;
      }

      // タイムアウトした接続をクリーンアップ
      if (now - connection.lastUsed >= this.MAX_IDLE_TIME) {
        await this.closeConnection(namespace);
      }
    }

    // 新規接続を作成
    return await this.createConnection(namespace);
  }

  /**
   * 新規接続を作成
   */
  private async createConnection(namespace: string): Promise<Client> {
    const servers = getEnabledServers();
    const serverConfig = servers.find((s) => s.namespace === namespace);

    if (!serverConfig) {
      throw new Error(
        `Server configuration not found for namespace: ${namespace}`,
      );
    }

    try {
      logger.logInfo("Creating new MCP connection", { namespace });

      const { client } = await createRemoteMcpClient(serverConfig);

      const connection: MCPConnection = {
        client,
        lastUsed: Date.now(),
        isActive: true,
        namespace,
      };

      this.pools.set(namespace, connection);

      logger.logInfo("MCP connection created successfully", { namespace });

      return client;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.logError(namespace, "createConnection", error as Error);
      throw new Error(`Failed to create MCP connection: ${errorMessage}`);
    }
  }

  /**
   * 接続を解放（プールに返却）
   */
  releaseConnection(namespace: string): void {
    const connection = this.pools.get(namespace);
    if (connection) {
      connection.isActive = false;
      connection.lastUsed = Date.now();
    }
  }

  /**
   * 接続を閉じる
   */
  private async closeConnection(namespace: string): Promise<void> {
    const connection = this.pools.get(namespace);
    if (!connection) return;

    try {
      await connection.client.close();
      this.pools.delete(namespace);
      logger.logInfo("MCP connection closed", { namespace });
    } catch (error) {
      logger.logError(namespace, "closeConnection", error as Error);
    }
  }

  /**
   * 定期的なクリーンアップを開始
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections().catch((error) => {
        logger.logError("cleanup", "cleanupIdleConnections", error as Error);
      });
    }, this.HEALTH_CHECK_INTERVAL);

    // プロセス終了を妨げないように
    this.cleanupTimer.unref?.();

    logger.logInfo("Cleanup timer started", {
      interval: this.HEALTH_CHECK_INTERVAL,
    });
  }

  /**
   * アイドル接続をクリーンアップ
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToClose: string[] = [];

    // タイムアウトした接続を特定
    for (const [namespace, connection] of this.pools) {
      if (
        !connection.isActive &&
        now - connection.lastUsed > this.MAX_IDLE_TIME
      ) {
        connectionsToClose.push(namespace);
      }
    }

    if (connectionsToClose.length === 0) {
      return;
    }

    // 接続を閉じて削除
    for (const namespace of connectionsToClose) {
      await this.closeConnection(namespace);
    }

    logger.logInfo("Cleanup completed", {
      cleanedConnections: connectionsToClose.length,
      activeConnections: this.pools.size,
    });
  }

  /**
   * 接続のヘルスチェック
   */
  async healthCheck(namespace: string): Promise<boolean> {
    const connection = this.pools.get(namespace);
    if (!connection) {
      return false;
    }

    try {
      // tools/listで軽量なヘルスチェック
      await connection.client.request(
        {
          method: "tools/list",
        },
        ListToolsResultSchema,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): PoolStats {
    const connections = Array.from(this.pools.values()).map((conn) => ({
      namespace: conn.namespace,
      lastUsed: conn.lastUsed,
      isHealthy: !conn.isActive, // アクティブでない = 利用可能 = ヘルシー
      idleTime: Date.now() - conn.lastUsed,
    }));

    return {
      totalConnections: this.pools.size,
      healthyConnections: connections.filter((c) => c.isHealthy).length,
      connections,
    };
  }

  /**
   * 全ての接続をクリーンアップ（シャットダウン時）
   */
  async cleanup(): Promise<void> {
    // タイマーを停止
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    // 全接続を閉じる
    const closePromises = Array.from(this.pools.keys()).map((namespace) =>
      this.closeConnection(namespace),
    );

    await Promise.allSettled(closePromises);

    this.pools.clear();

    logger.logInfo("All connections cleaned up");
  }
}

// シングルトンインスタンスをエクスポート
export const remoteMcpPool = new RemoteMcpPool();

// グレースフルシャットダウン対応
process.on("SIGTERM", () => {
  remoteMcpPool.cleanup().catch(console.error);
});

process.on("SIGINT", () => {
  remoteMcpPool.cleanup().catch(console.error);
});
