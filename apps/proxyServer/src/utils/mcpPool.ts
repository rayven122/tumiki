import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerConfig } from "../libs/types.js";
import { createMCPClient } from "./createMCPClient.js";
import { logger } from "../libs/logger.js";

/**
 * MCP接続情報
 */
type MCPConnection = {
  client: Client;
  lastUsed: number;
  isActive: boolean;
  cleanup?: () => Promise<void>;
};

/**
 * MCPコネクションプール
 *
 * シンプルで効率的な接続プール実装
 * - 接続の再利用でオーバーヘッド削減
 * - 自動的なアイドル接続のクリーンアップ
 * - サーバーあたり最大5接続の制限
 */
class MCPConnectionPool {
  private readonly pools = new Map<string, MCPConnection[]>();
  private readonly MAX_CONNECTIONS_PER_SERVER = 5; // サーバーあたり最大5接続
  private readonly MAX_TOTAL_CONNECTIONS = 60; // 全体で最大60接続（4GB最適化）
  private readonly IDLE_TIMEOUT = 180000; // 3分でアイドル接続切断
  private cleanupTimer?: NodeJS.Timeout;
  private totalConnections = 0;

  /**
   * プールキーを生成
   */
  private getPoolKey(instanceId: string, serverName: string): string {
    return `${instanceId}:${serverName}`;
  }

  /**
   * 接続を取得（既存または新規作成）
   */
  async getConnection(
    userServerConfigInstanceId: string,
    serverName: string,
    serverConfig: ServerConfig,
  ): Promise<Client> {
    const poolKey = this.getPoolKey(userServerConfigInstanceId, serverName);
    const pool = this.pools.get(poolKey) || [];

    // クリーンアップタイマーを開始（初回のみ）
    if (!this.cleanupTimer) {
      this.startCleanupTimer();
    }

    // 利用可能な接続を探す
    const now = Date.now();
    const available = pool.find(
      (conn) => !conn.isActive && now - conn.lastUsed < this.IDLE_TIMEOUT,
    );

    if (available) {
      // 既存接続を再利用
      available.isActive = true;
      available.lastUsed = now;
      logger.debug("Reused connection from pool", { serverName });
      return available.client;
    }

    // 新規接続が必要かチェック
    if (pool.length >= this.MAX_CONNECTIONS_PER_SERVER) {
      // アイドル接続を強制的に再利用
      const idle = pool.find((conn) => !conn.isActive);
      if (idle) {
        idle.isActive = true;
        idle.lastUsed = now;
        return idle.client;
      }
      throw new Error(
        `Maximum connections (${this.MAX_CONNECTIONS_PER_SERVER}) reached for server: ${serverName}`,
      );
    }

    // 全体の接続数制限チェック
    if (this.totalConnections >= this.MAX_TOTAL_CONNECTIONS) {
      // 最も古いアイドル接続を探して強制的に再利用
      let oldestIdle: MCPConnection | null = null;
      let oldestPoolKey: string | null = null;

      for (const [key, p] of this.pools) {
        for (const conn of p) {
          if (
            !conn.isActive &&
            (!oldestIdle || conn.lastUsed < oldestIdle.lastUsed)
          ) {
            oldestIdle = conn;
            oldestPoolKey = key;
          }
        }
      }

      if (oldestIdle && oldestPoolKey) {
        // 古い接続を閉じて削除
        await oldestIdle.client.close();
        await oldestIdle.cleanup?.();
        const oldPool = this.pools.get(oldestPoolKey);
        if (oldPool) {
          const index = oldPool.indexOf(oldestIdle);
          if (index > -1) {
            oldPool.splice(index, 1);
            this.totalConnections--;
          }
        }
      } else {
        throw new Error(
          `Maximum total connections (${this.MAX_TOTAL_CONNECTIONS}) reached across all servers`,
        );
      }
    }

    // 新規接続を作成
    try {
      const { client, transport, credentialsCleanup } =
        await createMCPClient(serverConfig);

      if (!client || !transport) {
        throw new Error("Failed to create client or transport");
      }

      await client.connect(transport);

      const connection: MCPConnection = {
        client,
        lastUsed: now,
        isActive: true,
        cleanup: credentialsCleanup,
      };

      pool.push(connection);
      this.pools.set(poolKey, pool);
      this.totalConnections++;

      logger.debug("Created new connection", {
        serverName,
        poolSize: pool.length,
      });
      return client;
    } catch (error) {
      logger.error("Failed to create connection", {
        serverName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 接続を解放（プールに返却）
   */
  releaseConnection(
    userServerConfigInstanceId: string,
    serverName: string,
    client: Client,
  ): void {
    const poolKey = this.getPoolKey(userServerConfigInstanceId, serverName);
    const pool = this.pools.get(poolKey);

    if (!pool) return;

    const connection = pool.find((conn) => conn.client === client);
    if (connection) {
      connection.isActive = false;
      connection.lastUsed = Date.now();
      logger.debug("Released connection to pool", { serverName });
    }
  }

  /**
   * 定期的なクリーンアップを開始
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections().catch((error) => {
        logger.error("Cleanup error", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, 60000); // 1分ごと

    // プロセス終了を妨げないように
    this.cleanupTimer.unref?.();
  }

  /**
   * アイドル接続をクリーンアップ
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToClose: Array<{ conn: MCPConnection; poolKey: string }> =
      [];

    // タイムアウトした接続を特定
    for (const [poolKey, pool] of this.pools) {
      for (const conn of pool) {
        if (!conn.isActive && now - conn.lastUsed > this.IDLE_TIMEOUT) {
          connectionsToClose.push({ conn, poolKey });
        }
      }
    }

    if (connectionsToClose.length === 0) return;

    logger.debug(`Cleaning up ${connectionsToClose.length} idle connections`);

    // 接続を閉じて削除
    for (const { conn, poolKey } of connectionsToClose) {
      try {
        await conn.client.close();
        await conn.cleanup?.();
      } catch (error) {
        // エラーはログに記録するが続行
        logger.warn("Failed to close connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // プールから削除
      const pool = this.pools.get(poolKey);
      if (pool) {
        const index = pool.indexOf(conn);
        if (index > -1) {
          pool.splice(index, 1);
          this.totalConnections--;
          if (pool.length === 0) {
            this.pools.delete(poolKey);
          }
        }
      }
    }
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

    // 全接続を閉じる
    const allConnections: MCPConnection[] = [];
    for (const pool of this.pools.values()) {
      allConnections.push(...pool);
    }

    await Promise.allSettled(
      allConnections.map(async (conn) => {
        try {
          await conn.client.close();
          await conn.cleanup?.();
        } catch {
          // エラーは無視
        }
      }),
    );

    this.pools.clear();
    this.totalConnections = 0;
    logger.debug("Cleaned up all connections");
  }

  /**
   * 統計情報を取得（デバッグ用）
   */
  getStats(): {
    poolCount: number;
    totalConnections: number;
    activeConnections: number;
    maxTotalConnections: number;
    maxConnectionsPerServer: number;
    idleTimeout: number;
  } {
    let activeConnections = 0;

    for (const pool of this.pools.values()) {
      activeConnections += pool.filter((c) => c.isActive).length;
    }

    return {
      poolCount: this.pools.size,
      totalConnections: this.totalConnections,
      activeConnections,
      maxTotalConnections: this.MAX_TOTAL_CONNECTIONS,
      maxConnectionsPerServer: this.MAX_CONNECTIONS_PER_SERVER,
      idleTimeout: this.IDLE_TIMEOUT,
    };
  }
}

// シングルトンインスタンスをエクスポート
export const mcpPool = new MCPConnectionPool();

// グレースフルシャットダウン対応
process.on("SIGTERM", () => {
  mcpPool.cleanup().catch(console.error);
});

process.on("SIGINT", () => {
  mcpPool.cleanup().catch(console.error);
});
