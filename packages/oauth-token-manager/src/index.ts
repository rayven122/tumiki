/**
 * OAuth Token Manager - Public API
 *
 * 関数ベースのAPI（Google Cloud Run サーバーレス環境向け）
 */

// メイン関数API
export {
  getValidToken,
  refreshBackendToken,
  invalidateCache,
} from "./oauth-token-manager.js";

// Redis接続管理
export { getRedisClient, cleanupRedisConnection } from "./redis-connection.js";

// キャッシュ関数
export {
  getCacheKey,
  getFromCache,
  cacheToken,
  invalidateCache as invalidateCacheByClient,
} from "./token-cache.js";

// リフレッシュ関数
export { refreshBackendToken as refreshTokenById } from "./token-refresh.js";

// リポジトリ関数
export { getTokenFromDB, updateLastUsedAt } from "./token-repository.js";

// バリデーション関数
export {
  isTokenExpired,
  isExpiringSoon,
  toDecryptedToken,
} from "./token-validator.js";

// 型定義
export type {
  DecryptedToken,
  OAuthClientInfo,
  TokenRefreshResponse,
} from "./types.js";

// エラークラス
export { ReAuthRequiredError, TokenRefreshError } from "./types.js";
