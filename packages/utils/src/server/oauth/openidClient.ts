/**
 * OpenID Client - Simplified wrapper
 * openid-clientライブラリの薄いラッパー層
 */

import type * as client from "openid-client";
/**
 * openid-clientの関数をインポート
 */
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  clientCredentialsGrant,
  ClientSecretBasic,
  ClientSecretJwt,
  ClientSecretPost,
  discovery,
  dynamicClientRegistration,
  None,
  PrivateKeyJwt,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
  TlsClientAuth,
  tokenIntrospection,
  tokenRevocation,
} from "openid-client";

import { db } from "@tumiki/db/server";

import type { TokenResponse } from "./types.js";

// Re-export for external use
export {
  discovery,
  dynamicClientRegistration,
  authorizationCodeGrant,
  refreshTokenGrant,
  clientCredentialsGrant,
  tokenRevocation,
  tokenIntrospection,
  buildAuthorizationUrl,
  randomState,
  randomNonce,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  ClientSecretBasic,
  ClientSecretPost,
  ClientSecretJwt,
  PrivateKeyJwt,
  None,
  TlsClientAuth,
};

// openid-client型のエクスポート
export type {
  Configuration,
  ServerMetadata,
  ClientMetadata,
  TokenEndpointResponse,
  IntrospectionResponse,
  ClientAuth,
  ModifyAssertionOptions,
  DPoPOptions,
} from "openid-client";

/**
 * トークンをデータベースに保存
 */
export const saveTokenToDb = async (
  userMcpConfigId: string,
  oauthClientId: string,
  tokens: TokenResponse,
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
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
      isValid: true,
    },
  });

  return token.id;
};

/**
 * 有効なトークンを取得
 */
export const getValidTokenFromDb = async (
  configId: string,
): Promise<{ accessToken: string; refreshToken?: string } | null> => {
  const token = await db.oAuthToken.findFirst({
    where: {
      userMcpConfigId: configId,
      isValid: true,
    },
  });

  if (!token) {
    return null;
  }

  // 有効期限チェック
  if (token.expiresAt && token.expiresAt < new Date()) {
    // トークンが期限切れ
    return null;
  }

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? undefined,
  };
};

/**
 * OAuth2エラーチェック (openid-client v6用)
 */
export const isOAuth2Error = (
  error: unknown,
): error is { error: string; error_description?: string } => {
  return (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as { error?: string }).error === "string"
  );
};

/**
 * TokenEndpointResponseをTokenResponseに変換
 */
export const convertToTokenResponse = (
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

/**
 * ステート生成のラッパー関数
 */
export const generateState = randomState;

/**
 * ナンス生成のラッパー関数
 */
export const generateNonce = randomNonce;

/**
 * PKCE Code Verifier生成のラッパー関数
 */
export const generatePKCEVerifier = randomPKCECodeVerifier;

/**
 * PKCE Code Challenge生成のラッパー関数
 */
export const generatePKCEChallenge = calculatePKCECodeChallenge;

/**
 * 統合OAuthクライアントインターフェース
 */
export interface UnifiedOAuthClient {
  initialize: (config: {
    issuerUrl: string;
    clientId: string;
    clientSecret?: string;
  }) => Promise<void>;
  createAuthorizationUrl: (params: {
    redirect_uri: string;
    scope?: string;
    state?: string;
    nonce?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }) => URL;
  handleCallback: (params: {
    callbackUrl: URL;
    expectedState?: string;
    expectedNonce?: string;
    codeVerifier?: string;
  }) => Promise<client.TokenEndpointResponse>;
  refreshToken: (refreshToken: string) => Promise<client.TokenEndpointResponse>;
  revokeToken: (token: string) => Promise<void>;
}

/**
 * 統合OAuthクライアントを作成
 */
export const createUnifiedOAuthClient = (): UnifiedOAuthClient => {
  let configuration: client.Configuration | null = null;

  return {
    async initialize({ issuerUrl, clientId, clientSecret }) {
      configuration = await discovery(
        new URL(issuerUrl),
        clientId,
        clientSecret,
      );
    },

    createAuthorizationUrl(params) {
      if (!configuration) {
        throw new Error("Client not initialized");
      }
      return buildAuthorizationUrl(configuration, params);
    },

    async handleCallback({
      callbackUrl,
      expectedState,
      expectedNonce,
      codeVerifier,
    }) {
      if (!configuration) {
        throw new Error("Client not initialized");
      }
      return await authorizationCodeGrant(configuration, callbackUrl, {
        expectedState,
        expectedNonce,
        pkceCodeVerifier: codeVerifier,
      });
    },

    async refreshToken(refreshToken) {
      if (!configuration) {
        throw new Error("Client not initialized");
      }
      return await refreshTokenGrant(configuration, refreshToken);
    },

    async revokeToken(token) {
      if (!configuration) {
        throw new Error("Client not initialized");
      }
      await tokenRevocation(configuration, token);
    },
  };
};
