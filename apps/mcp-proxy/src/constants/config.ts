/**
 * アプリケーション全体で使用される定数の定義
 */

/**
 * キャッシュ関連の設定
 */
export const CACHE_CONFIG = {
  /**
   * デフォルトのキャッシュTTL（秒）
   */
  DEFAULT_TTL_SECONDS: 300, // 5分

  /**
   * キャッシュキーのプレフィックス
   */
  KEY_PREFIX: {
    MCP_CONFIG: "mcp:config:",
  },
} as const;

/**
 * タイムアウト関連の設定（ミリ秒）
 */
export const TIMEOUT_CONFIG = {
  /**
   * MCP接続タイムアウト（ミリ秒）
   */
  MCP_CONNECTION_MS: 10000, // 10秒

  /**
   * Graceful Shutdownタイムアウト（ミリ秒）
   * Cloud Runの10秒猶予期間内に収める
   */
  GRACEFUL_SHUTDOWN_MS: 9000, // 9秒
} as const;

/**
 * 認証関連のパターンと設定
 */
export const AUTH_CONFIG = {
  /**
   * 認証パターン
   */
  PATTERNS: {
    /**
     * JWTトークンのプレフィックス
     * base64エンコードされたJSON（eyJで始まる）
     */
    JWT_PREFIX: "Bearer eyJ",

    /**
     * Tumiki APIキーのプレフィックス
     */
    API_KEY_PREFIX: "Bearer tumiki_",
  },

  /**
   * HTTPヘッダー名
   */
  HEADERS: {
    AUTHORIZATION: "Authorization",
    API_KEY: "X-API-Key",
  },
} as const;
