import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerConfig } from "../../libs/types.js";

/**
 * MCP接続のオプション
 */
export type MCPConnectionOptions = {
  userServerConfigInstanceId: string;
  serverName: string;
  serverConfig: ServerConfig;
};

/**
 * MCP接続情報
 */
export type MCPConnection = {
  /** MCPクライアント */
  client: Client;
  /** トランスポート */
  transport: Transport;
  /** 最後に使用された時刻 */
  lastUsed: number;
  /** アクティブ状態 */
  isActive: boolean;
  /** サーバー名 */
  serverName: string;
  /** ユーザーサーバー設定インスタンスID */
  userServerConfigInstanceId: string;
  /** 認証情報クリーンアップ関数 */
  credentialsCleanup?: () => Promise<void>;
};

/**
 * 接続プールの設定
 */
export type PoolConfig = {
  /** サーバーあたりの最大接続数 */
  maxConnectionsPerServer: number;
  /** アイドルタイムアウト（ミリ秒） */
  idleTimeout: number;
  /** クリーンアップ間隔（ミリ秒） */
  cleanupInterval: number;
};
