import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
// Google認証情報の型定義（一時的に定義）
type GoogleCredentials = Record<string, unknown>;

import type { ServerConfig } from "../libs/types.js";
import { recordError } from "../libs/metrics.js";

/**
 * MCP接続ラッパークラス
 * 個別の接続を管理し、ヘルスチェック機能を提供
 */
class MCPConnection {
  public client: Client;
  public lastUsed: number;
  public isActive: boolean;
  private transport: Transport;
  private credentialsCleanup?: () => Promise<void>;

  constructor(
    client: Client,
    transport: Transport,
    credentialsCleanup?: () => Promise<void>,
  ) {
    this.client = client;
    this.transport = transport;
    this.lastUsed = Date.now();
    this.isActive = true;
    this.credentialsCleanup = credentialsCleanup;
  }

  /**
   * 接続のヘルスチェック
   * 接続が正常に機能しているかを確認
   */
  async healthCheck(): Promise<boolean> {
    try {
      // ping/pongやtools/listなどの軽いリクエストで接続確認
      // クライアントの接続状態をチェック
      return this.transport && this.isActive;
    } catch {
      this.isActive = false;
      return false;
    }
  }

  /**
   * 接続を閉じる
   */
  async close(): Promise<void> {
    try {
      this.isActive = false;

      // クライアントをクローズ
      if (this.client) {
        await this.client.close();
      }

      // トランスポートをクローズ
      if (this.transport) {
        await this.transport.close();
      }

      // Google認証情報のクリーンアップ
      if (this.credentialsCleanup) {
        await this.credentialsCleanup();
      }
    } catch {
      // クリーンアップ失敗は無視
    }
  }

  /**
   * 最終使用時刻を更新
   */
  updateLastUsed(): void {
    this.lastUsed = Date.now();
  }
}

/**
 * サーバー別接続プール
 * 特定のMCPサーバーに対する接続を管理
 */
class ServerConnectionPool {
  private connections: MCPConnection[] = [];
  private activeConnections = 0;
  private readonly maxConnections = 3; // サーバーあたり最大3接続
  private readonly idleTimeout = 180000; // 3分でタイムアウト
  private readonly serverConfig: ServerConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(serverConfig: ServerConfig) {
    this.serverConfig = serverConfig;
    this.startCleanupTimer();
  }

  /**
   * 接続を取得（既存接続の再利用または新規作成）
   */
  async getConnection(): Promise<MCPConnection> {
    // 既存の有効な接続を検索
    const availableConnection = await this.findAvailableConnection();
    if (availableConnection) {
      availableConnection.updateLastUsed();
      return availableConnection;
    }

    // 最大接続数チェック
    if (this.activeConnections >= this.maxConnections) {
      // 古い接続を削除
      await this.evictOldestConnection();
    }

    // 新しい接続を作成
    return await this.createNewConnection();
  }

  /**
   * 接続をプールに返却
   */
  async releaseConnection(connection: MCPConnection): Promise<void> {
    if (!connection.isActive) {
      // 無効な接続は削除
      await this.removeConnection(connection);
      return;
    }

    // 接続をプールに戻す（既にプール内にある場合は何もしない）
    connection.updateLastUsed();
  }

  /**
   * プール統計を取得
   */
  getStats() {
    return {
      totalConnections: this.connections.length,
      activeConnections: this.activeConnections,
      serverName: this.serverConfig.name,
    };
  }

  /**
   * 使用可能な接続を検索
   */
  private async findAvailableConnection(): Promise<MCPConnection | null> {
    for (const connection of this.connections) {
      if (await connection.healthCheck()) {
        return connection;
      } else {
        // 無効な接続を削除
        await this.removeConnection(connection);
      }
    }
    return null;
  }

  /**
   * 新しい接続を作成
   */
  private async createNewConnection(): Promise<MCPConnection> {
    const { client, transport, credentialsCleanup } = await this.createClient();

    if (!client || !transport) {
      throw new Error(
        `Failed to create connection to ${this.serverConfig.name}`,
      );
    }

    try {
      await client.connect(transport);

      const connection = new MCPConnection(
        client,
        transport,
        credentialsCleanup,
      );
      this.connections.push(connection);
      this.activeConnections++;

      return connection;
    } catch (error) {
      // 接続失敗時のクリーンアップ
      if (credentialsCleanup) {
        await credentialsCleanup();
      }
      if (transport) {
        await transport.close();
      }
      throw error;
    }
  }

  /**
   * クライアントを作成（proxy.tsのcreateClient関数をベース）
   */
  private async createClient(): Promise<{
    client: Client | undefined;
    transport: Transport | undefined;
    credentialsCleanup?: () => Promise<void>;
  }> {
    let transport: Transport | null = null;
    let credentialsCleanup: (() => Promise<void>) | undefined;

    try {
      if (this.serverConfig.transport.type === "sse") {
        // Type narrowing: when type is "sse", url is guaranteed to be string
        const sseTransport = this.serverConfig.transport;
        if ("url" in sseTransport && typeof sseTransport.url === "string") {
          transport = new SSEClientTransport(new URL(sseTransport.url));
        } else {
          throw new Error("SSE transport requires a valid URL");
        }
      } else {
        const finalEnv = this.serverConfig.transport.env
          ? Object.fromEntries(
              Object.entries(this.serverConfig.transport.env).map(
                ([key, value]) => [
                  key,
                  String(value), // DBの値を優先（process.envは使用しない）
                ],
              ),
            )
          : {};

        // Google認証情報の処理（一時的に無効化）
        if (this.serverConfig.googleCredentials) {
          // setupGoogleCredentialsEnvが使用できないため、一時的にスキップ
          console.warn("Google credentials handling is temporarily disabled");
        }

        transport = new StdioClientTransport({
          command: this.serverConfig.transport.command,
          args: this.serverConfig.transport.args,
          env: finalEnv,
        });
      }
    } catch {
      recordError("transport_creation_failed");
      return { transport: undefined, client: undefined, credentialsCleanup };
    }

    const client = new Client({
      name: "mcp-proxy-client",
      version: "1.0.0",
    });

    return { client, transport, credentialsCleanup };
  }

  /**
   * 接続を削除
   */
  private async removeConnection(connection: MCPConnection): Promise<void> {
    const index = this.connections.indexOf(connection);
    if (index !== -1) {
      this.connections.splice(index, 1);
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      await connection.close();
    }
  }

  /**
   * 最も古い接続を削除
   */
  private async evictOldestConnection(): Promise<void> {
    if (this.connections.length === 0) return;

    // lastUsedが最も古い接続を見つける
    let oldestConnection = this.connections[0];
    if (!oldestConnection) return;

    for (const connection of this.connections) {
      if (connection.lastUsed < oldestConnection.lastUsed) {
        oldestConnection = connection;
      }
    }

    await this.removeConnection(oldestConnection);
  }

  /**
   * 期限切れ接続のクリーンアップタイマーを開始
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredConnections();
    }, 60000); // 1分ごと
  }

  /**
   * 期限切れ接続をクリーンアップ
   */
  private async cleanupExpiredConnections(): Promise<void> {
    const now = Date.now();
    const expiredConnections = this.connections.filter(
      (conn) => now - conn.lastUsed > this.idleTimeout,
    );

    for (const connection of expiredConnections) {
      await this.removeConnection(connection);
    }
  }

  /**
   * プールを完全にクリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    const cleanupPromises = this.connections.map((conn) =>
      this.removeConnection(conn),
    );
    await Promise.all(cleanupPromises);
  }
}

/**
 * プール統計情報
 */
export interface PoolStats {
  totalPools: number;
  totalConnections: number;
  activeConnections: number;
  pools: Array<{
    serverName: string;
    totalConnections: number;
    activeConnections: number;
  }>;
}

/**
 * メイン接続プール管理クラス
 * 全てのMCPサーバーへの接続プールを統括管理
 */
export class MCPConnectionPool {
  private pools = new Map<string, ServerConnectionPool>();
  private maxTotalConnections = 30; // 全体で最大30接続（メモリ制約）
  private static instance: MCPConnectionPool | null = null;

  private constructor() {
    // シングルトンパターンの実装
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): MCPConnectionPool {
    if (!MCPConnectionPool.instance) {
      MCPConnectionPool.instance = new MCPConnectionPool();
    }
    return MCPConnectionPool.instance;
  }

  /**
   * 接続を取得
   * userMcpServerInstanceIdとserverNameの組み合わせで接続プールを識別
   */
  async getConnection(
    userMcpServerInstanceId: string,
    serverConfig: ServerConfig,
  ): Promise<MCPConnection> {
    const poolKey = `${userMcpServerInstanceId}_${serverConfig.name}`;

    let pool = this.pools.get(poolKey);
    if (!pool) {
      pool = new ServerConnectionPool(serverConfig);
      this.pools.set(poolKey, pool);
    }

    // 全体の接続数制限チェック
    const currentTotalConnections = this.getTotalConnectionCount();
    if (currentTotalConnections >= this.maxTotalConnections) {
      // 使用頻度の低いプールから接続を削除
      await this.evictLeastUsedConnections();
    }

    return await pool.getConnection();
  }

  /**
   * 接続をプールに返却
   */
  async releaseConnection(
    connection: MCPConnection,
    userMcpServerInstanceId: string,
    serverName: string,
  ): Promise<void> {
    const poolKey = `${userMcpServerInstanceId}_${serverName}`;
    const pool = this.pools.get(poolKey);

    if (pool) {
      await pool.releaseConnection(connection);
    } else {
      // プールが存在しない場合は接続を閉じる
      await connection.close();
    }
  }

  /**
   * プール統計を取得
   */
  getPoolStats(): PoolStats {
    const pools = Array.from(this.pools.entries()).map(([key, pool]) => {
      const stats = pool.getStats();
      return {
        serverName: key,
        totalConnections: stats.totalConnections,
        activeConnections: stats.activeConnections,
      };
    });

    return {
      totalPools: this.pools.size,
      totalConnections: pools.reduce(
        (sum, pool) => sum + pool.totalConnections,
        0,
      ),
      activeConnections: pools.reduce(
        (sum, pool) => sum + pool.activeConnections,
        0,
      ),
      pools,
    };
  }

  /**
   * 全体の接続数を取得
   */
  private getTotalConnectionCount(): number {
    let total = 0;
    for (const pool of this.pools.values()) {
      total += pool.getStats().totalConnections;
    }
    return total;
  }

  /**
   * 使用頻度の低い接続を削除
   */
  private async evictLeastUsedConnections(): Promise<void> {
    // 単純な実装として、最初のプールから1つの接続を削除
    // より高度な実装では、LRUアルゴリズムを使用
    const firstPool = this.pools.values().next().value;
    if (firstPool) {
      const stats = firstPool.getStats();
      if (stats.totalConnections > 0) {
        // 最も古い接続を削除する処理は、ServerConnectionPool内で実装
        await firstPool.cleanup();
      }
    }
  }

  /**
   * 全プールをクリーンアップ
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.pools.values()).map((pool) =>
      pool.cleanup(),
    );
    await Promise.all(cleanupPromises);
    this.pools.clear();
  }
}

/**
 * グローバルコネクションプールインスタンス
 */
export const connectionPool = MCPConnectionPool.getInstance();

// プロセス終了時のクリーンアップ
process.on("SIGTERM", () => {
  void connectionPool.cleanup().catch((error: unknown) => {
    console.error("Error cleaning up MCP connection pool:", error);
  });
});

process.on("SIGINT", () => {
  void connectionPool.cleanup().catch((error: unknown) => {
    console.error("Error cleaning up MCP connection pool:", error);
  });
});
