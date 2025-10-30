/**
 * OAuth Token Manager
 *
 * Backend MCP OAuth トークンの管理を担当する関数API
 * - トークンの取得・リフレッシュ
 * - Redisキャッシュ管理
 * - 有効期限チェックと自動リフレッシュ
 */

import type { DecryptedToken } from "./types.js";
import { logger } from "./logger.js";
import { getRedisClient } from "./redis-connection.js";
import {
  cacheToken,
  getCacheKey,
  getFromCache,
  invalidateCache as invalidateCacheInternal,
} from "./token-cache.js";
import { refreshBackendToken as refreshToken } from "./token-refresh.js";
import { getTokenFromDB, updateLastUsedAt } from "./token-repository.js";
import {
  isExpiringSoon,
  isTokenExpired,
  toDecryptedToken,
} from "./token-validator.js";
import { ReAuthRequiredError } from "./types.js";

/**
 * 有効なBackend MCPトークンを取得
 *
 * 1. Redisキャッシュから取得を試みる
 * 2. キャッシュミスの場合、DBから取得
 * 3. 有効期限チェック
 * 4. 期限切れ間近の場合、自動リフレッシュ
 * 5. トークンを返却（キャッシュに保存）
 *
 * @param mcpServerId MCPサーバーID
 * @param userId ユーザーID
 * @returns 復号化されたトークン
 * @throws ReAuthRequiredError トークンが無効または存在しない場合
 */
export const getValidToken = async (
  mcpServerId: string,
  userId: string,
): Promise<DecryptedToken> => {
  const redisClient = await getRedisClient();
  const cacheKey = getCacheKey(userId, mcpServerId);

  // 1. Redisキャッシュから取得
  const cachedToken = await getFromCache(redisClient, cacheKey);
  if (cachedToken) {
    logger.debug("Token retrieved from cache", { mcpServerId, userId });
    return cachedToken;
  }

  // 2. DBから取得
  const token = await getTokenFromDB(mcpServerId, userId);

  if (!token) {
    throw new ReAuthRequiredError(
      "OAuth token not found. User needs to authenticate.",
      "",
      userId,
      mcpServerId,
    );
  }

  if (!token.isValid) {
    throw new ReAuthRequiredError(
      "OAuth token is invalid. User needs to re-authenticate.",
      token.id,
      userId,
      mcpServerId,
    );
  }

  // 3. 有効期限チェック
  if (isTokenExpired(token)) {
    logger.info("Token has expired", { tokenId: token.id });
    throw new ReAuthRequiredError(
      "OAuth token has expired. User needs to re-authenticate.",
      token.id,
      userId,
      mcpServerId,
    );
  }

  // 4. 期限切れ間近の場合、自動リフレッシュ
  if (isExpiringSoon(token)) {
    logger.info("Token is expiring soon, refreshing...", {
      tokenId: token.id,
    });
    try {
      const refreshedToken = await refreshToken(token.id);
      await cacheToken(redisClient, cacheKey, refreshedToken);
      return refreshedToken;
    } catch (error) {
      logger.error("Failed to refresh token", {
        tokenId: token.id,
        error,
      });
      // リフレッシュ失敗時は再認証が必要
      throw new ReAuthRequiredError(
        "Failed to refresh token. User needs to re-authenticate.",
        token.id,
        userId,
        mcpServerId,
      );
    }
  }

  // 5. キャッシュに保存して返却
  const decryptedToken = toDecryptedToken(token);
  await cacheToken(redisClient, cacheKey, decryptedToken);

  // lastUsedAtを更新（非同期）
  updateLastUsedAt(token.id).catch((error: unknown) => {
    logger.error("Failed to update lastUsedAt", { tokenId: token.id, error });
  });

  return decryptedToken;
};

/**
 * Backend MCPトークンをリフレッシュ
 *
 * @param tokenId トークンID
 * @returns リフレッシュされたトークン
 * @throws TokenRefreshError リフレッシュに失敗した場合
 */
export const refreshBackendToken = async (
  tokenId: string,
): Promise<DecryptedToken> => {
  return refreshToken(tokenId);
};

/**
 * キャッシュを無効化
 *
 * @param userId ユーザーID
 * @param mcpServerId MCPサーバーID
 */
export const invalidateCache = async (
  userId: string,
  mcpServerId: string,
): Promise<void> => {
  const redisClient = await getRedisClient();
  await invalidateCacheInternal(redisClient, userId, mcpServerId);
};
