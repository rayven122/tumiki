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
import {
  cacheToken,
  getCacheKey,
  getFromCache,
  invalidateCache as invalidateCacheInternal,
} from "./token-cache.js";
import { refreshBackendToken as refreshToken } from "./token-refresh.js";
import { getTokenFromDB } from "./token-repository.js";
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
 * @param mcpServerTemplateInstanceId MCPサーバーテンプレートインスタンスID
 * @param userId ユーザーID
 * @returns 復号化されたトークン
 * @throws ReAuthRequiredError トークンが無効または存在しない場合
 */
export const getValidToken = async (
  mcpServerTemplateInstanceId: string,
  userId: string,
): Promise<DecryptedToken> => {
  const cacheKey = getCacheKey(userId, mcpServerTemplateInstanceId);

  // 1. Redisキャッシュから取得
  const cachedToken = await getFromCache(cacheKey);
  if (cachedToken) {
    logger.debug("Token retrieved from cache", {
      mcpServerTemplateInstanceId,
      userId,
    });
    return cachedToken;
  }

  // 2. DBから取得
  const token = await getTokenFromDB(mcpServerTemplateInstanceId, userId);

  if (!token) {
    throw new ReAuthRequiredError(
      "OAuth token not found. User needs to authenticate.",
      "",
      userId,
      mcpServerTemplateInstanceId,
    );
  }

  // 3. 期限切れまたは期限切れ間近の場合、自動リフレッシュを試行
  if (isTokenExpired(token) || isExpiringSoon(token)) {
    const isExpired = isTokenExpired(token);
    logger.info(
      isExpired
        ? "Token has expired, attempting refresh"
        : "Token expiring soon, attempting refresh",
      {
        tokenId: token.id,
      },
    );

    try {
      const refreshedToken = await refreshToken(token.id);
      await cacheToken(cacheKey, refreshedToken);
      logger.info("Token refreshed successfully", { tokenId: token.id });
      return refreshedToken;
    } catch (error) {
      logger.error("Failed to refresh token", {
        tokenId: token.id,
        error,
      });
      // リフレッシュ失敗時は再認証が必要
      throw new ReAuthRequiredError(
        isExpired
          ? "OAuth token has expired and refresh failed. User needs to re-authenticate."
          : "Failed to refresh token. User needs to re-authenticate.",
        token.id,
        userId,
        mcpServerTemplateInstanceId,
      );
    }
  }

  // 5. キャッシュに保存して返却
  const decryptedToken = toDecryptedToken(token);
  await cacheToken(cacheKey, decryptedToken);

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
 * @param mcpServerTemplateId MCPサーバーテンプレートID
 */
export const invalidateCache = async (
  userId: string,
  mcpServerTemplateId: string,
): Promise<void> => {
  await invalidateCacheInternal(userId, mcpServerTemplateId);
};
