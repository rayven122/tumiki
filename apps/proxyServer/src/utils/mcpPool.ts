import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerConfig } from "../libs/types.js";
import { createMCPClient } from "./createMCPClient.js";
import { logger } from "../libs/logger.js";
import { AtomicCounter } from "./atomicCounter.js";
import { createSessionCache, type SessionCache } from "./sessionCache.js";
import { sessions, type SessionInfo } from "./session.js";

/**
 * MCP接続情報
 */
type MCPConnection = {
  client: Client;
  lastUsed: number;
  isActive: boolean;
  cleanup?: () => Promise<void>;
  sessionId?: string; // 関連するセッションID
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
  private readonly connectionCounter = new AtomicCounter(); // 原子的カウンター
  private readonly sessionCache: SessionCache = createSessionCache(); // セッションキャッシュ

  /**
   * Connection stateを原子的に更新
   */
  private updateConnectionState(conn: MCPConnection, isActive: boolean): void {
    conn.isActive = isActive;
    conn.lastUsed = Date.now();
  }

  /**
   * プールキーを生成（セキュア版）
   */
  private getPoolKey(instanceId: string, serverName: string): string {
    // セキュリティ: コロンを安全な区切り文字に置換してから結合
    const safeInstanceId = instanceId.replace(/:/g, "_COLON_");
    const safeServerName = serverName.replace(/:/g, "_COLON_");
    return `${safeInstanceId}:${safeServerName}`;
  }

  /**
   * アクティブなセッションIDを高速検索
   */
  findActiveSessionId(userMcpServerInstanceId: string): string | undefined {
    // キャッシュから高速検索（O(1)）
    const sessionIds = this.sessionCache.getSessionIds(userMcpServerInstanceId);

    // セッションの有効性を確認
    for (const sessionId of sessionIds) {
      const session = sessions.get(sessionId);
      if (session && this.isSessionActive(session)) {
        return sessionId;
      }
    }

    return undefined;
  }

  /**
   * セッションがアクティブかチェック
   */
  private isSessionActive(session: SessionInfo): boolean {
    const now = Date.now();
    const timeSinceActivity = now - session.lastActivity;
    return timeSinceActivity <= this.IDLE_TIMEOUT;
  }

  /**
   * 接続を取得（既存または新規作成）
   */
  async getConnection(
    userServerConfigInstanceId: string,
    serverName: string,
    serverConfig: ServerConfig,
    sessionId?: string,
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
      this.updateConnectionState(available, true);
      return available.client;
    }

    // 新規接続が必要かチェック
    if (pool.length >= this.MAX_CONNECTIONS_PER_SERVER) {
      // アイドル接続を強制的に再利用
      const idle = pool.find((conn) => !conn.isActive);
      if (idle) {
        this.updateConnectionState(idle, true);
        return idle.client;
      }
      throw new Error(
        `Maximum connections (${this.MAX_CONNECTIONS_PER_SERVER}) reached for server`,
      );
    }

    // 全体の接続数制限チェック
    if (this.connectionCounter.get() >= this.MAX_TOTAL_CONNECTIONS) {
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
            await this.connectionCounter.decrement();
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
        sessionId,
      };

      // セッションキャッシュに追加
      if (sessionId && userServerConfigInstanceId) {
        this.sessionCache.add(sessionId, userServerConfigInstanceId);
      }

      pool.push(connection);
      this.pools.set(poolKey, pool);
      await this.connectionCounter.increment();

      return client;
    } catch (error) {
      logger.error("Failed to create connection", {
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
    sessionId?: string,
  ): void {
    const poolKey = this.getPoolKey(userServerConfigInstanceId, serverName);
    const pool = this.pools.get(poolKey);

    if (!pool) return;

    const connection = pool.find((conn) => conn.client === client);
    if (connection) {
      this.updateConnectionState(connection, false);
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
          await this.connectionCounter.decrement();

          // セッションキャッシュからも削除
          if (conn.sessionId) {
            this.sessionCache.remove(conn.sessionId);
          }

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
    await this.connectionCounter.reset();
    this.sessionCache.clear();
  }

  /**
   * セッションキャッシュの統計情報を取得
   */
  getSessionCacheStats() {
    return this.sessionCache.getStats();
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
