import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ServerConfig } from "../libs/types.js";
import { createMCPClient } from "./createMCPClient.js";
import { logger } from "../libs/logger.js";
import { AtomicCounter } from "./atomicCounter.js";
import { config } from "../libs/config.js";
import { i18n, createErrorWithCode } from "./i18n.js";

/**
 * MCP接続情報
 */
type MCPConnection = {
  client: Client;
  lastUsed: number;
  isActive: boolean;
  instanceId: string; // 接続の一意識別子
  cleanup?: () => Promise<void>;
};

/**
 * MCPコネクションプール
 *
 * セッション独立型の接続プール実装
 * - セッションごとに独立した接続を管理
 * - 接続の競合を防止
 * - 自動的なアイドル接続のクリーンアップ
 * - 環境変数による柔軟な設定
 */
class MCPConnectionPool {
  // 定数定義
  private static readonly POOL_KEY_SEPARATOR = "::";
  private static readonly POOL_KEY_ESCAPE_PATTERN = /::/g;
  private static readonly POOL_KEY_ESCAPE_REPLACEMENT = "%3A%3A";
  private static readonly SHARED_SESSION_KEY = "shared";
  private static readonly INSTANCE_ID_RANDOM_LENGTH = 7;
  private readonly pools = new Map<string, MCPConnection[]>();
  private readonly sessionConnections = new Map<string, Set<string>>(); // セッションID -> 接続キーのマッピング
  private readonly sessionLocks = new Map<string, Promise<Client | null>>(); // セッション単位の排他制御
  private readonly idleConnectionsIndex = new Map<
    string,
    { conn: MCPConnection; poolKey: string }
  >(); // アイドル接続のインデックス
  private isRebuilding = false; // 再帰防止フラグ
  private readonly MAX_CONNECTIONS_PER_SERVER =
    config.connectionPool.maxConnectionsPerServer; // サーバーあたり最大接続数
  private readonly MAX_CONNECTIONS_PER_SESSION =
    config.connectionPool.maxConnectionsPerSession; // セッションあたり最大接続数
  private readonly MAX_TOTAL_CONNECTIONS =
    config.connectionPool.maxTotalConnections; // 全体で最大接続数（4GB最適化）
  private readonly IDLE_TIMEOUT = config.connectionPool.idleTimeout; // MCPプールのタイムアウト（セッションタイムアウトと同期）
  private readonly CLEANUP_INTERVAL = config.connectionPool.cleanupInterval; // クリーンアップ間隔
  private cleanupTimer?: NodeJS.Timeout;
  private readonly connectionCounter = new AtomicCounter(); // 同期カウンター

  /**
   * エラーハンドリングのヘルパーメソッド
   */
  private handleError(
    error: unknown,
    context: string,
    metadata?: Record<string, unknown>,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(context, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      ...metadata,
    });
  }

  /**
   * クリティカルエラー時のインデックス再構築処理
   */
  private handleCriticalIndexError(
    error: unknown,
    context: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.handleError(error, `Critical error in ${context}`, metadata);

    // 再帰防止のためのフラグを追加
    if (!this.isRebuilding) {
      this.isRebuilding = true;
      try {
        this.rebuildConnectionIndex();
      } catch (rebuildError) {
        this.handleError(
          rebuildError,
          "Failed to rebuild connection index during critical error recovery",
        );
      } finally {
        this.isRebuilding = false;
      }
    }
  }

  /**
   * Connection stateを原子的に更新
   */
  private updateConnectionState(
    conn: MCPConnection,
    isActive: boolean,
    poolKey: string,
  ): void {
    const connectionId = `${poolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${conn.instanceId}`;

    // 原子的な状態更新
    const currentTime = Date.now();
    conn.lastUsed = currentTime;
    conn.isActive = isActive;

    // インデックス更新を try-catch で保護
    try {
      if (isActive) {
        // アクティブになったら、インデックスから削除
        this.idleConnectionsIndex.delete(connectionId);
      } else {
        // 既存エントリの重複チェック
        if (!this.idleConnectionsIndex.has(connectionId)) {
          this.idleConnectionsIndex.set(connectionId, { conn, poolKey });
        }
      }
    } catch (error) {
      this.handleCriticalIndexError(error, "connection state update", {
        connectionId,
      });
    }
  }

  /**
   * インデックスを再構築（エラー復旧用）
   */
  private rebuildConnectionIndex(): void {
    logger.info("Rebuilding connection index");
    this.idleConnectionsIndex.clear();

    for (const [poolKey, pool] of this.pools) {
      for (const conn of pool) {
        if (!conn.isActive) {
          const connectionId = `${poolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${conn.instanceId}`;
          this.idleConnectionsIndex.set(connectionId, { conn, poolKey });
        }
      }
    }

    logger.info("Connection index rebuilt", {
      idleConnections: this.idleConnectionsIndex.size,
    });
  }

  /**
   * 最古のアイドル接続を効率的に取得
   */
  private getOldestIdleConnection(): {
    conn: MCPConnection;
    poolKey: string;
  } | null {
    let oldest: { conn: MCPConnection; poolKey: string } | null = null;

    for (const item of this.idleConnectionsIndex.values()) {
      if (!oldest || item.conn.lastUsed < oldest.conn.lastUsed) {
        oldest = item;
      }
    }

    return oldest;
  }

  /**
   * 安全なエンコーディング（区切り文字の衝突防止）
   */
  private safeEncode(value: string): string {
    return encodeURIComponent(value).replace(
      MCPConnectionPool.POOL_KEY_ESCAPE_PATTERN,
      MCPConnectionPool.POOL_KEY_ESCAPE_REPLACEMENT,
    );
  }

  /**
   * プールキーを生成（セッション対応版）
   */
  private getPoolKey(
    instanceId: string,
    serverName: string,
    sessionId?: string,
  ): string {
    const parts = [this.safeEncode(instanceId), this.safeEncode(serverName)];

    // セッション独立モードが有効な場合、セッションIDを含める
    const useSessionPool = config.connectionPool.sessionPoolSync;
    if (useSessionPool && sessionId) {
      parts.push(this.safeEncode(sessionId));
    } else if (useSessionPool) {
      parts.push(MCPConnectionPool.SHARED_SESSION_KEY);
    }

    // より衝突しにくい区切り文字を使用
    return parts.join(MCPConnectionPool.POOL_KEY_SEPARATOR);
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
    // セッション単位での排他制御
    if (sessionId && this.sessionLocks.has(sessionId)) {
      const existingLock = this.sessionLocks.get(sessionId);
      if (existingLock) {
        try {
          logger.debug("Waiting for existing session connection to complete", {
            sessionId,
          });
          await existingLock; // 既存の接続処理の完了を待つ
        } catch (error) {
          logger.warn("Existing session connection failed", {
            sessionId,
            error,
          });
          // 失敗した場合は続行（新しい接続を試す）
        }
      }
    }

    const connectionPromise = this.getConnectionInternal(
      userServerConfigInstanceId,
      serverName,
      serverConfig,
      sessionId,
    );

    if (sessionId) {
      this.sessionLocks.set(sessionId, connectionPromise);
      void connectionPromise.finally(() => {
        this.sessionLocks.delete(sessionId);
      });
    }

    return connectionPromise;
  }

  /**
   * 内部的な接続取得処理（排他制御なし）
   */
  private async getConnectionInternal(
    userServerConfigInstanceId: string,
    serverName: string,
    serverConfig: ServerConfig,
    sessionId?: string,
  ): Promise<Client> {
    const poolKey = this.getPoolKey(
      userServerConfigInstanceId,
      serverName,
      sessionId,
    );
    const pool = this.pools.get(poolKey) || [];

    // セッション接続数の制限チェック
    if (sessionId && config.connectionPool.sessionPoolSync) {
      const sessionConns = this.sessionConnections.get(sessionId) || new Set();
      if (sessionConns.size >= this.MAX_CONNECTIONS_PER_SESSION) {
        // 既存のセッション接続から利用可能なものを探す
        for (const connKey of sessionConns) {
          const connPool = this.pools.get(connKey);
          if (connPool) {
            const available = connPool.find((conn) => !conn.isActive);
            if (available) {
              this.updateConnectionState(available, true, connKey);
              return available.client;
            }
          }
        }
        throw createErrorWithCode(
          "MAX_CONNECTIONS_PER_SESSION",
          i18n.maxConnectionsPerSession(
            this.MAX_CONNECTIONS_PER_SESSION,
            sessionId,
          ),
        );
      }
    }

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
      this.updateConnectionState(available, true, poolKey);
      return available.client;
    }

    // 新規接続が必要かチェック
    if (pool.length >= this.MAX_CONNECTIONS_PER_SERVER) {
      // アイドル接続を強制的に再利用
      const idle = pool.find((conn) => !conn.isActive);
      if (idle) {
        this.updateConnectionState(idle, true, poolKey);
        return idle.client;
      }
      throw new Error(
        `Maximum connections (${this.MAX_CONNECTIONS_PER_SERVER}) reached for server`,
      );
    }

    // 全体の接続数制限チェック
    if (this.connectionCounter.get() >= this.MAX_TOTAL_CONNECTIONS) {
      // 効率的に最も古いアイドル接続を取得
      const oldest = this.getOldestIdleConnection();

      if (oldest) {
        const { conn: oldestIdle, poolKey: oldestPoolKey } = oldest;
        // 古い接続を閉じて削除
        await oldestIdle.client.close();
        await oldestIdle.cleanup?.();
        const oldPool = this.pools.get(oldestPoolKey);
        if (oldPool) {
          const index = oldPool.indexOf(oldestIdle);
          if (index > -1) {
            oldPool.splice(index, 1);
            this.connectionCounter.decrement();
            // インデックスから削除
            const connectionId = `${oldestPoolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${oldestIdle.instanceId}`;
            this.idleConnectionsIndex.delete(connectionId);

            // セッション接続マッピングからもクリーンアップ
            for (const [
              sessionId,
              poolKeys,
            ] of this.sessionConnections.entries()) {
              if (poolKeys.has(oldestPoolKey)) {
                if (poolKeys.size === 1) {
                  // このセッションの最後の接続だった場合
                  this.sessionConnections.delete(sessionId);
                } else {
                  // まだ他の接続がある場合
                  poolKeys.delete(oldestPoolKey);
                }
              }
            }
          }
        }
      } else {
        throw new Error(
          `Maximum total connections (${this.MAX_TOTAL_CONNECTIONS}) reached across all servers`,
        );
      }
    }

    // 新規接続を作成
    let connection: MCPConnection | null = null;
    try {
      logger.debug("Creating new MCP connection", {
        poolKey,
        sessionId,
        serverName,
      });

      const { client, transport, credentialsCleanup } =
        await createMCPClient(serverConfig);

      if (!client || !transport) {
        throw new Error(
          "Failed to create client or transport - null values returned",
        );
      }

      await client.connect(transport);

      connection = {
        client,
        lastUsed: now,
        isActive: true,
        instanceId: `${userServerConfigInstanceId}_${serverName}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 2 + MCPConnectionPool.INSTANCE_ID_RANDOM_LENGTH)}`,
        cleanup: credentialsCleanup,
      };

      pool.push(connection);
      this.pools.set(poolKey, pool);
      this.connectionCounter.increment();

      // 初期状態はアイドルとしてインデックスに登録
      const connectionId = `${poolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${connection.instanceId}`;
      try {
        this.idleConnectionsIndex.set(connectionId, {
          conn: connection,
          poolKey,
        });
      } catch (indexError) {
        this.handleError(indexError, "Failed to register connection in index", {
          connectionId,
        });
        // インデックス登録失敗でも接続は有効
      }

      // セッション接続マッピングを更新
      if (sessionId && config.connectionPool.sessionPoolSync) {
        try {
          const sessionConns =
            this.sessionConnections.get(sessionId) || new Set();
          sessionConns.add(poolKey);
          this.sessionConnections.set(sessionId, sessionConns);
        } catch (sessionError) {
          this.handleError(sessionError, "Failed to update session mapping", {
            sessionId,
            poolKey,
          });
          // セッションマッピング失敗でも接続は有効
        }
      }

      logger.debug("MCP connection created successfully", {
        poolKey,
        sessionId,
        instanceId: connection.instanceId,
      });

      return client;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to create MCP connection", {
        poolKey,
        sessionId,
        serverName,
        userServerConfigInstanceId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 部分的に作成された接続をクリーンアップ
      if (connection) {
        try {
          await connection.client?.close();
          await connection.cleanup?.();
        } catch (cleanupError) {
          this.handleError(
            cleanupError,
            "Failed to cleanup partially created connection",
            {
              instanceId: connection.instanceId,
            },
          );
        }
      }

      // 具体的なエラーメッセージでrethrow
      if (error instanceof Error) {
        throw new Error(`MCP connection creation failed: ${errorMessage}`);
      } else {
        throw new Error(`MCP connection creation failed: ${errorMessage}`);
      }
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
    const poolKey = this.getPoolKey(
      userServerConfigInstanceId,
      serverName,
      sessionId,
    );
    const pool = this.pools.get(poolKey);

    if (!pool) return;

    const connection = pool.find((conn) => conn.client === client);
    if (connection) {
      this.updateConnectionState(connection, false, poolKey);
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
    }, this.CLEANUP_INTERVAL);

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

    if (connectionsToClose.length === 0) {
      // インデックスの整合性チェック（定期メンテナンス）
      this.validateConnectionIndex();
      return;
    }

    // 接続を閉じて削除
    for (const { conn, poolKey } of connectionsToClose) {
      try {
        await conn.client.close();
        await conn.cleanup?.();
      } catch (error) {
        // エラーをログに記録
        logger.error("Failed to close connection during cleanup", {
          error: error instanceof Error ? error.message : String(error),
          poolKey,
          instanceId: conn.instanceId,
        });
      }

      // プールから削除（エラーが発生してもクリーンアップを継続）
      try {
        const pool = this.pools.get(poolKey);
        if (pool) {
          const index = pool.indexOf(conn);
          if (index > -1) {
            pool.splice(index, 1);
            this.connectionCounter.decrement();

            // インデックスからも確実に削除
            const connectionId = `${poolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${conn.instanceId}`;
            this.idleConnectionsIndex.delete(connectionId);

            if (pool.length === 0) {
              this.pools.delete(poolKey);
            }
          }
        }
      } catch (error) {
        logger.error("Failed to remove connection from pool", {
          error: error instanceof Error ? error.message : String(error),
          poolKey,
          instanceId: conn.instanceId,
        });
        // インデックス破損の可能性があるため再構築（再帰防止付き）
        this.handleCriticalIndexError(error, "connection pool cleanup");
      }
    }

    logger.debug("Cleanup completed", {
      cleanedConnections: connectionsToClose.length,
      activeConnections: this.connectionCounter.get(),
      idleIndexSize: this.idleConnectionsIndex.size,
    });
  }

  /**
   * インデックスの整合性を検証（定期メンテナンス）
   */
  private validateConnectionIndex(): void {
    let inconsistencies = 0;

    // 実際のアイドル接続とインデックスを比較
    const actualIdleConnections = new Set<string>();
    for (const [poolKey, pool] of this.pools) {
      for (const conn of pool) {
        if (!conn.isActive) {
          const connectionId = `${poolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${conn.instanceId}`;
          actualIdleConnections.add(connectionId);
        }
      }
    }

    // インデックスに存在するが実際にはない接続を検出
    for (const connectionId of this.idleConnectionsIndex.keys()) {
      if (!actualIdleConnections.has(connectionId)) {
        this.idleConnectionsIndex.delete(connectionId);
        inconsistencies++;
      }
    }

    // 実際にあるがインデックスにない接続を検出
    for (const connectionId of actualIdleConnections) {
      if (!this.idleConnectionsIndex.has(connectionId)) {
        // プールから接続を見つけて追加
        const parts = connectionId.split(MCPConnectionPool.POOL_KEY_SEPARATOR);
        if (parts.length >= 2) {
          const poolKey = parts[0];
          const instanceId = parts[1];
          if (poolKey && instanceId) {
            const pool = this.pools.get(poolKey);
            if (pool) {
              const conn = pool.find(
                (c) => c.instanceId === instanceId && !c.isActive,
              );
              if (conn) {
                this.idleConnectionsIndex.set(connectionId, { conn, poolKey });
                inconsistencies++;
              }
            }
          }
        }
      }
    }

    if (inconsistencies > 0) {
      logger.warn("Connection index inconsistencies detected and fixed", {
        inconsistencies,
        indexSize: this.idleConnectionsIndex.size,
      });
    }
  }

  /**
   * セッションのクリーンアップ
   */
  async cleanupSession(sessionId: string): Promise<void> {
    // セッションロックがある場合は先に削除
    if (this.sessionLocks.has(sessionId)) {
      const existingLock = this.sessionLocks.get(sessionId);
      if (existingLock) {
        try {
          await existingLock; // 実行中の処理を待つ
        } catch (error) {
          logger.warn("Session connection failed during cleanup", {
            sessionId,
            error,
          });
        }
      }
      this.sessionLocks.delete(sessionId);
    }

    const sessionConns = this.sessionConnections.get(sessionId);
    if (!sessionConns) return;

    for (const poolKey of sessionConns) {
      const pool = this.pools.get(poolKey);
      if (pool) {
        // セッションの全接続を閉じる
        for (const conn of pool) {
          try {
            await conn.client.close();
            await conn.cleanup?.();
            this.connectionCounter.decrement();

            // アイドル接続インデックスからも削除
            const connectionId = `${poolKey}${MCPConnectionPool.POOL_KEY_SEPARATOR}${conn.instanceId}`;
            this.idleConnectionsIndex.delete(connectionId);
          } catch (error) {
            // エラーをログに記録（セッションクリーンアップ失敗は重要なのでerrorレベル）
            this.handleError(error, "Failed to cleanup session connection", {
              sessionId,
              poolKey,
              instanceId: conn.instanceId,
            });
            // 接続状態を強制的に無効化
            conn.isActive = false;
            this.updateConnectionState(conn, false, poolKey);
          }
        }
        this.pools.delete(poolKey);
      }
    }

    this.sessionConnections.delete(sessionId);
  }

  /**
   * 接続のヘルスチェック
   */
  async isConnectionHealthy(client: Client): Promise<boolean> {
    try {
      // pingのような軽量なリクエストを送信
      await client.request(
        {
          method: "tools/list",
          params: { _meta: { test: true } },
        },
        ListToolsResultSchema,
      );
      return true;
    } catch {
      return false;
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

    // 実行中のセッションロックを全て待機してからクリア
    const lockPromises = Array.from(this.sessionLocks.values());
    if (lockPromises.length > 0) {
      logger.info("Waiting for session locks to complete before cleanup", {
        pendingLocks: lockPromises.length,
      });
      await Promise.allSettled(lockPromises);
    }
    this.sessionLocks.clear();

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
    this.idleConnectionsIndex.clear();
    this.sessionConnections.clear();
    this.connectionCounter.reset();
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
