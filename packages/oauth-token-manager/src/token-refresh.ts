/**
 * OAuth Token Refresh Manager
 *
 * OAuth 2.0トークンリフレッシュ処理（純粋関数）
 */

import type { McpOAuthToken } from "@tumiki/db";
import { db } from "@tumiki/db/server";

import type { DecryptedToken, TokenRefreshResponse } from "./types.js";
import { logger } from "./logger.js";
import { TokenRefreshError } from "./types.js";

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
  // 1. DBからトークンとOAuthクライアント情報を取得
  const token = await db.mcpOAuthToken.findUnique({
    where: { id: tokenId },
    include: {
      oauthClient: true,
    },
  });

  if (!token) {
    throw new TokenRefreshError(`Token not found: ${tokenId}`, tokenId);
  }

  if (!token.refreshToken) {
    throw new TokenRefreshError("Refresh token is not available", tokenId);
  }

  const { oauthClient } = token;

  // 2. Authorization Serverからエンドポイント情報を取得
  const discoveryResponse = await fetch(
    `${oauthClient.authorizationServerUrl}/.well-known/oauth-authorization-server`,
  );

  if (!discoveryResponse.ok) {
    throw new TokenRefreshError(
      `Failed to fetch discovery endpoint: ${discoveryResponse.status}`,
      tokenId,
    );
  }

  const discovery = (await discoveryResponse.json()) as {
    token_endpoint: string;
    token_endpoint_auth_methods_supported?: string[];
  };

  const tokenEndpointAuthMethod =
    discovery.token_endpoint_auth_methods_supported?.[0] ||
    "client_secret_basic";

  // 3. トークンエンドポイントにリフレッシュリクエスト
  try {
    const response = await requestTokenRefresh(discovery.token_endpoint, {
      clientId: oauthClient.clientId,
      clientSecret: oauthClient.clientSecret,
      refreshToken: token.refreshToken,
      tokenEndpointAuthMethod,
    });

    // 4. DBを新トークンで更新
    const expiresAt = new Date(Date.now() + response.expires_in * 1000);
    const updatedToken = await db.mcpOAuthToken.update({
      where: { id: tokenId },
      data: {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || token.refreshToken,
        expiresAt,
      },
      include: {
        oauthClient: true,
      },
    });

    logger.info("Token refreshed successfully", {
      tokenId,
    });

    return toDecryptedToken(updatedToken);
  } catch (error) {
    // エラー情報を記録
    logger.error("Token refresh failed", { tokenId, error });

    throw new TokenRefreshError(
      `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
      tokenId,
      error instanceof Error ? error : undefined,
    );
  }
};

/**
 * トークンリフレッシュリクエストを送信
 *
 * @param tokenEndpoint トークンエンドポイント
 * @param params リフレッシュパラメータ
 * @returns トークンレスポンス
 */
const requestTokenRefresh = async (
  tokenEndpoint: string,
  params: {
    clientId: string;
    clientSecret: string | null;
    refreshToken: string;
    tokenEndpointAuthMethod: string;
  },
): Promise<TokenRefreshResponse> => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // 認証方式に応じてヘッダーまたはボディに認証情報を追加
  if (params.tokenEndpointAuthMethod === "client_secret_basic") {
    const credentials = Buffer.from(
      `${params.clientId}:${params.clientSecret || ""}`,
    ).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  } else if (params.tokenEndpointAuthMethod === "client_secret_post") {
    body.append("client_id", params.clientId);
    if (params.clientSecret) {
      body.append("client_secret", params.clientSecret);
    }
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token refresh request failed: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as TokenRefreshResponse;
  return data;
};

/**
 * McpOAuthTokenをDecryptedTokenに変換
 *
 * @param token McpOAuthToken
 * @returns DecryptedToken
 */
const toDecryptedToken = (
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
