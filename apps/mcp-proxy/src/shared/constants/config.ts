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
 * エージェント実行関連の設定
 */
export const AGENT_EXECUTION_CONFIG = {
  /**
   * 実行タイムアウト（ミリ秒）
   * ストリーミング実行・スケジュール実行で統一
   */
  EXECUTION_TIMEOUT_MS: 5 * 60 * 1000, // 5分

  /**
   * 最大ツール呼び出しステップ数
   */
  MAX_TOOL_STEPS: 10,

  /**
   * デフォルトのエージェントモデル
   */
  DEFAULT_MODEL: "anthropic/claude-3-5-sonnet",

  /**
   * 自動モデル選択を示す特別なID
   * フロントエンドの AUTO_MODEL_ID と同じ値
   */
  AUTO_MODEL_ID: "auto",

  /**
   * 孤立したエージェント実行のクリーンアップ間隔（ミリ秒）
   * 本番環境でネットワークエラー等で実行中のまま残った実行を定期的にクリーンアップ
   */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5分
} as const;

/**
 * モデルIDを解決する
 *
 * "auto" または未設定の場合はデフォルトモデルを返す
 *
 * @param modelId - エージェントに設定されたモデルID
 * @returns 実際に使用するモデルID
 */
export const resolveModelId = (modelId: string | null | undefined): string => {
  if (!modelId || modelId === AGENT_EXECUTION_CONFIG.AUTO_MODEL_ID) {
    return AGENT_EXECUTION_CONFIG.DEFAULT_MODEL;
  }
  return modelId;
};

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
    API_KEY: "Tumiki-API-Key",
  },
} as const;
