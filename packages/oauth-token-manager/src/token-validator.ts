/**
 * OAuth Token Validator
 *
 * トークンの有効性チェック（純粋関数）
 */

import type { McpOAuthToken } from "@tumiki/db";

import type { DecryptedToken } from "./types.js";

/**
 * デフォルトの有効期限バッファ（秒）
 * トークンの有効期限がこの時間以内になったら自動リフレッシュを実行
 */
const DEFAULT_EXPIRY_BUFFER_SECONDS = 30 * 60; // 30分

/**
 * トークンが期限切れかどうかをチェック
 *
 * @param token トークン
 * @returns 期限切れの場合true
 */
export const isTokenExpired = (token: McpOAuthToken): boolean => {
  if (!token.expiresAt) {
    return false; // 有効期限が設定されていない場合は期限切れとみなさない
  }
  return token.expiresAt.getTime() <= Date.now();
};

/**
 * トークンが期限切れ間近かどうかをチェック
 *
 * @param token トークン
 * @param bufferSeconds バッファ時間（秒）デフォルト30分
 * @returns 期限切れ間近の場合true
 */
export const isExpiringSoon = (
  token: McpOAuthToken,
  bufferSeconds: number = DEFAULT_EXPIRY_BUFFER_SECONDS,
): boolean => {
  if (!token.expiresAt) {
    return false;
  }
  const bufferMs = bufferSeconds * 1000;
  return token.expiresAt.getTime() <= Date.now() + bufferMs;
};

/**
 * McpOAuthTokenをDecryptedTokenに変換
 *
 * @param token McpOAuthToken
 * @returns DecryptedToken
 */
export const toDecryptedToken = (
  token: McpOAuthToken & {
    oauthClient: {
      id: string;
    };
  },
): DecryptedToken => {
  return {
    id: token.id,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    oauthClientId: token.oauthClient.id,
  };
};
