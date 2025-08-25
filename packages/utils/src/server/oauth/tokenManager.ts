/**
 * Token Manager - Simplified with openid-client
 * openid-clientの機能を活用した簡潔なトークン管理
 */

import * as client from "openid-client";

import { db } from "@tumiki/db/server";

import type { TokenManagerOptions, TokenResponse } from "./types.js";
import { calculateTokenExpiry } from "./minimalUtils.js";

/**
 * デフォルトオプション
 */
const DEFAULT_OPTIONS: Required<TokenManagerOptions> = {
  tokenRefreshBuffer: 300, // 5分前にリフレッシュ
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * トークンキャッシュ（メモリ内）
 * シンプルなMap実装で代替
 */
const tokenCache = new Map<string, { token: TokenResponse; expiry: number }>();

/**
 * キャッシュからトークンを取得
 */
const getCachedToken = (key: string): TokenResponse | undefined => {
  const cached = tokenCache.get(key);
  if (!cached) return undefined;

  if (Date.now() > cached.expiry) {
    tokenCache.delete(key);
    return undefined;
  }

  return cached.token;
};

/**
 * キャッシュにトークンを保存
 */
const setCachedToken = (key: string, token: TokenResponse): void => {
  tokenCache.set(key, {
    token,
    expiry: Date.now() + 15 * 60 * 1000, // 15分後に期限切れ
  });
};

/**
 * トークンをデータベースに保存
 */
export const saveToken = async (
  userMcpConfigId: string,
  oauthClientId: string,
  tokens: TokenResponse,
  sessionData?: {
    state?: string;
    nonce?: string;
    codeVerifier?: string;
  },
): Promise<string> => {
  // 既存のトークンを無効化
  await db.oAuthToken.updateMany({
    where: {
      userMcpConfigId,
      isValid: true,
    },
    data: {
      isValid: false,
    },
  });

  // 新しいトークンを保存
  const token = await db.oAuthToken.create({
    data: {
      userMcpConfigId,
      oauthClientId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      tokenType: tokens.token_type || "Bearer",
      scope: tokens.scope,
      expiresAt: tokens.expires_in
        ? calculateTokenExpiry(tokens.expires_in)
        : undefined,
      refreshExpiresAt: tokens.refresh_expires_in
        ? calculateTokenExpiry(tokens.refresh_expires_in)
        : undefined,
      state: sessionData?.state,
      nonce: sessionData?.nonce,
      codeVerifier: sessionData?.codeVerifier,
      isValid: true,
    },
  });

  // キャッシュに保存
  setCachedToken(userMcpConfigId, tokens);

  return token.id;
};

/**
 * 有効なトークンを取得（自動リフレッシュ付き）
 */
export const getValidToken = async (
  userMcpConfigId: string,
  config?: client.Configuration,
  options: TokenManagerOptions = {},
): Promise<TokenResponse | null> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // キャッシュから取得を試みる
  const cached = getCachedToken(userMcpConfigId);
  if (cached) {
    return cached;
  }

  // データベースから取得
  const token = await db.oAuthToken.findFirst({
    where: {
      userMcpConfigId,
      isValid: true,
    },
    include: {
      oauthClient: true,
    },
  });

  if (!token) {
    return null;
  }

  // トークンが期限切れまたは期限切れ間近の場合
  const now = new Date();
  const bufferTime = new Date(now.getTime() + opts.tokenRefreshBuffer * 1000);

  if (token.expiresAt && token.expiresAt <= bufferTime) {
    // リフレッシュトークンがあり、configが提供されている場合はリフレッシュを試みる
    if (token.refreshToken && config) {
      try {
        const newTokens = await client.refreshTokenGrant(
          config,
          token.refreshToken,
        );

        const refreshedTokens: TokenResponse = {
          access_token: newTokens.access_token,
          token_type: newTokens.token_type || "Bearer",
          expires_in: newTokens.expires_in,
          refresh_token: newTokens.refresh_token,
          id_token: newTokens.id_token,
          scope: newTokens.scope,
        };

        // 新しいトークンを保存
        await saveToken(userMcpConfigId, token.oauthClientId, refreshedTokens, {
          state: token.state ?? undefined,
          nonce: token.nonce ?? undefined,
          codeVerifier: token.codeVerifier ?? undefined,
        });

        return refreshedTokens;
      } catch (error) {
        console.error("Failed to refresh token:", error);

        // リフレッシュが失敗した場合、トークンを無効化
        await invalidateToken(token.id);
        return null;
      }
    }

    // リフレッシュできない場合、期限切れとして扱う
    if (token.expiresAt <= now) {
      await invalidateToken(token.id);
      return null;
    }
  }

  // 有効なトークンを返す
  const tokenResponse: TokenResponse = {
    access_token: token.accessToken,
    token_type: token.tokenType,
    refresh_token: token.refreshToken ?? undefined,
    id_token: token.idToken ?? undefined,
    scope: token.scope ?? undefined,
    expires_in: token.expiresAt
      ? Math.floor((token.expiresAt.getTime() - now.getTime()) / 1000)
      : undefined,
  };

  // キャッシュに保存
  setCachedToken(userMcpConfigId, tokenResponse);

  return tokenResponse;
};

/**
 * トークンを無効化
 */
export const invalidateToken = async (tokenId: string): Promise<void> => {
  await db.oAuthToken.update({
    where: { id: tokenId },
    data: {
      isValid: false,
      lastError: "Token invalidated",
      lastErrorAt: new Date(),
    },
  });
};

/**
 * トークンを完全に削除
 */
export const deleteToken = async (tokenId: string): Promise<void> => {
  await db.oAuthToken.delete({
    where: { id: tokenId },
  });
};

/**
 * ユーザーのすべてのトークンを無効化
 */
export const invalidateAllUserTokens = async (
  userId: string,
): Promise<void> => {
  const configs = await db.userMcpServerConfig.findMany({
    where: {
      organization: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  const configIds = configs.map((c) => c.id);

  await db.oAuthToken.updateMany({
    where: {
      userMcpConfigId: {
        in: configIds,
      },
      isValid: true,
    },
    data: {
      isValid: false,
      lastError: "All tokens invalidated",
      lastErrorAt: new Date(),
    },
  });

  // キャッシュをクリア
  for (const configId of configIds) {
    tokenCache.delete(configId);
  }
};

/**
 * MCPサーバーのすべてのトークンを無効化
 */
export const invalidateMcpServerTokens = async (
  mcpServerId: string,
): Promise<void> => {
  const client = await db.oAuthClient.findUnique({
    where: { mcpServerId },
    select: { id: true },
  });

  if (!client) {
    return;
  }

  const tokens = await db.oAuthToken.findMany({
    where: {
      oauthClientId: client.id,
      isValid: true,
    },
    select: {
      id: true,
      userMcpConfigId: true,
    },
  });

  await db.oAuthToken.updateMany({
    where: {
      oauthClientId: client.id,
      isValid: true,
    },
    data: {
      isValid: false,
      lastError: "MCP server tokens invalidated",
      lastErrorAt: new Date(),
    },
  });

  // キャッシュをクリア
  for (const token of tokens) {
    tokenCache.delete(token.userMcpConfigId);
  }
};

/**
 * キャッシュをクリア
 */
export const clearTokenCache = (): void => {
  tokenCache.clear();
};

/**
 * TokenEndpointResponseからTokenResponseへの変換
 */
export const convertFromTokenEndpointResponse = (
  response: client.TokenEndpointResponse,
): TokenResponse => {
  return {
    access_token: response.access_token,
    token_type: response.token_type || "Bearer",
    expires_in: response.expires_in,
    refresh_token: response.refresh_token,
    id_token: response.id_token,
    scope: response.scope,
  };
};
