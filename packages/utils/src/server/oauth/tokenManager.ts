/**
 * OAuth Token Manager
 * トークンの永続化、暗号化、リフレッシュを管理
 * 共通パッケージ版 - proxyServerとmanagerの両方で使用
 */

import { db } from "@tumiki/db/server";

import type { OAuthError, TokenData, TokenResponse } from "./types.js";

/**
 * デフォルト設定
 */
const DEFAULT_TOKEN_REFRESH_BUFFER = 300; // 5 minutes
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * トークンを保存
 */
export const saveToken = async (tokenData: TokenData): Promise<string> => {
  try {
    console.log("Saving OAuth token", {
      userMcpConfigId: tokenData.userMcpConfigId,
      hasRefreshToken: !!tokenData.refreshToken,
      scope: tokenData.scope,
    });

    // 既存のトークンを無効化
    await db.oAuthToken.updateMany({
      where: {
        userMcpConfigId: tokenData.userMcpConfigId,
        isValid: true,
      },
      data: {
        isValid: false,
      },
    });

    // 新しいトークンを保存
    const token = await db.oAuthToken.create({
      data: {
        userMcpConfigId: tokenData.userMcpConfigId,
        oauthClientId: tokenData.oauthClientId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        idToken: tokenData.idToken,
        tokenType: tokenData.tokenType,
        scope: tokenData.scope,
        expiresAt: tokenData.expiresAt,
        refreshExpiresAt: tokenData.refreshExpiresAt,
        isValid: true,
      },
    });

    console.log("OAuth token saved successfully", {
      tokenId: token.id,
      expiresAt: token.expiresAt,
    });

    return token.id;
  } catch (error) {
    console.error("Failed to save OAuth token", {
      userMcpConfigId: tokenData.userMcpConfigId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * 有効なトークンを取得
 */
export const getValidToken = async (
  configId: string,
  options?: { tokenRefreshBuffer?: number },
): Promise<string | null> => {
  const tokenRefreshBuffer =
    options?.tokenRefreshBuffer ?? DEFAULT_TOKEN_REFRESH_BUFFER;

  try {
    const token = await db.oAuthToken.findFirst({
      where: {
        userMcpConfigId: configId,
        isValid: true,
      },
      include: {
        oauthClient: true,
      },
    });

    if (!token) {
      console.debug("No valid token found", { configId });
      return null;
    }

    // トークンの有効期限をチェック
    if (token.expiresAt) {
      const now = new Date();
      const expiryWithBuffer = new Date(
        token.expiresAt.getTime() - tokenRefreshBuffer * 1000,
      );

      if (now >= expiryWithBuffer) {
        console.log("Token needs refresh", {
          tokenId: token.id,
          expiresAt: token.expiresAt,
          now,
        });

        // リフレッシュトークンがあれば更新を試みる
        if (token.refreshToken) {
          const newAccessToken = await refreshToken(token.id);
          if (newAccessToken) {
            return newAccessToken;
          }
        }

        // リフレッシュできない場合はトークンを無効化
        await invalidateToken(token.id);
        return null;
      }
    }

    // 最終使用日時を更新
    await db.oAuthToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });

    return token.accessToken;
  } catch (error) {
    console.error("Failed to get valid token", {
      configId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * 実際のトークンリフレッシュ処理
 */
const performTokenRefresh = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  refreshTokenValue: string,
): Promise<TokenResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEFAULT_REQUEST_TIMEOUT,
  );

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: OAuthError;
      try {
        errorData = JSON.parse(errorText) as OAuthError;
      } catch {
        errorData = {
          error: "refresh_failed",
          error_description: `Token refresh failed with status ${response.status}: ${errorText}`,
        };
      }

      throw new Error(
        errorData.error_description ??
          `Token refresh failed: ${errorData.error}`,
      );
    }

    const tokenResponse = (await response.json()) as TokenResponse;

    if (!tokenResponse.access_token) {
      throw new Error("Invalid token response: missing access_token");
    }

    return tokenResponse;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * トークンをリフレッシュ
 */
export const refreshToken = async (
  tokenId: string,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  },
): Promise<string | null> => {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelay = options?.retryDelay ?? DEFAULT_RETRY_DELAY;

  try {
    const token = await db.oAuthToken.findUnique({
      where: { id: tokenId },
      include: {
        oauthClient: true,
      },
    });

    if (!token?.refreshToken || !token.oauthClient.clientSecret) {
      console.error("Cannot refresh token: missing required data", {
        tokenId,
      });
      return null;
    }

    console.log("Refreshing OAuth token", {
      tokenId,
      clientId: token.oauthClient.clientId,
    });

    // リトライロジック付きでトークンをリフレッシュ
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await performTokenRefresh(
          token.oauthClient.tokenEndpoint,
          token.oauthClient.clientId,
          token.oauthClient.clientSecret,
          token.refreshToken,
        );

        // 新しいトークンを保存
        const newTokenData: TokenData = {
          userMcpConfigId: token.userMcpConfigId,
          oauthClientId: token.oauthClientId,
          accessToken: response.access_token,
          refreshToken: response.refresh_token ?? token.refreshToken,
          idToken: response.id_token,
          tokenType: response.token_type,
          scope: response.scope ?? token.scope ?? undefined,
          expiresAt: response.expires_in
            ? new Date(Date.now() + response.expires_in * 1000)
            : undefined,
          refreshExpiresAt: response.refresh_expires_in
            ? new Date(Date.now() + response.refresh_expires_in * 1000)
            : (token.refreshExpiresAt ?? undefined),
        };

        await saveToken(newTokenData);

        // 古いトークンを無効化
        await invalidateToken(tokenId);

        console.log("Token refreshed successfully", {
          tokenId,
          newExpiresAt: newTokenData.expiresAt,
        });

        return response.access_token;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Token refresh attempt ${attempt} failed`, {
          tokenId,
          attempt,
          error: lastError.message,
        });

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // すべてのリトライが失敗
    console.error("Token refresh failed after all retries", {
      tokenId,
      error: lastError?.message,
    });

    // エラー情報を記録
    await db.oAuthToken.update({
      where: { id: tokenId },
      data: {
        lastError: lastError?.message,
        lastErrorAt: new Date(),
        isValid: false,
      },
    });

    return null;
  } catch (error) {
    console.error("Failed to refresh token", {
      tokenId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * トークンを無効化
 */
export const invalidateToken = async (tokenId: string): Promise<void> => {
  try {
    await db.oAuthToken.update({
      where: { id: tokenId },
      data: {
        isValid: false,
        updatedAt: new Date(),
      },
    });

    console.log("Token invalidated", { tokenId });
  } catch (error) {
    console.error("Failed to invalidate token", {
      tokenId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * 実際のトークン取り消し処理
 */
const performTokenRevocation = async (
  revocationEndpoint: string,
  clientId: string,
  clientSecret: string,
  token: string,
  tokenTypeHint: "access_token" | "refresh_token",
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEFAULT_REQUEST_TIMEOUT,
  );

  try {
    const response = await fetch(revocationEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        token,
        token_type_hint: tokenTypeHint,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 200) {
      const errorText = await response.text();
      console.warn("Token revocation may have failed", {
        status: response.status,
        error: errorText,
      });
    }
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * トークンを取り消し（Revoke）
 */
export const revokeToken = async (tokenId: string): Promise<void> => {
  try {
    const token = await db.oAuthToken.findUnique({
      where: { id: tokenId },
      include: {
        oauthClient: true,
      },
    });

    if (!token) {
      console.warn("Token not found for revocation", { tokenId });
      return;
    }

    // Revocation endpointがある場合は使用
    if (
      token.oauthClient.revocationEndpoint &&
      token.oauthClient.clientSecret
    ) {
      await performTokenRevocation(
        token.oauthClient.revocationEndpoint,
        token.oauthClient.clientId,
        token.oauthClient.clientSecret,
        token.accessToken,
        "access_token",
      );

      if (token.refreshToken) {
        await performTokenRevocation(
          token.oauthClient.revocationEndpoint,
          token.oauthClient.clientId,
          token.oauthClient.clientSecret,
          token.refreshToken,
          "refresh_token",
        );
      }
    }

    // データベースから削除
    await db.oAuthToken.delete({
      where: { id: tokenId },
    });

    console.log("Token revoked and deleted", { tokenId });
  } catch (error) {
    console.error("Failed to revoke token", {
      tokenId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * 期限切れトークンをクリーンアップ
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const now = new Date();

    console.debug("Starting expired token cleanup", {
      timestamp: now.toISOString(),
    });

    // 期限切れまたは無効なトークンを削除
    const result = await db.oAuthToken.deleteMany({
      where: {
        OR: [
          // アクセストークンが期限切れかつ無効
          {
            AND: [
              {
                expiresAt: {
                  lt: now,
                },
              },
              {
                isValid: false,
              },
            ],
          },
          // リフレッシュトークンが期限切れ
          {
            refreshExpiresAt: {
              lt: now,
            },
          },
          // 明示的に無効化されたトークン（1日経過後）
          {
            AND: [
              {
                isValid: false,
              },
              {
                updatedAt: {
                  lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
                },
              },
            ],
          },
        ],
      },
    });

    if (result.count > 0) {
      console.log("Expired token cleanup completed", {
        deletedCount: result.count,
        timestamp: now.toISOString(),
      });
    } else {
      console.debug("No expired tokens found during cleanup", {
        timestamp: now.toISOString(),
      });
    }

    return result.count;
  } catch (error) {
    console.error("Failed to cleanup expired tokens", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};
