/**
 * OAuth Utilities
 * PKCE生成、JWT検証、エラーハンドリングなどのユーティリティ関数
 * 共通パッケージ版 - proxyServerとmanagerの両方で使用
 */

import crypto from "crypto";

import type { OAuthError, PKCEChallenge } from "./types.js";

/**
 * PKCE (Proof Key for Code Exchange) チャレンジを生成
 * RFC 7636準拠
 */
export const generatePKCE = (): PKCEChallenge => {
  // Code Verifierを生成（43-128文字のランダム文字列）
  const codeVerifier = crypto.randomBytes(96).toString("base64url");

  // Code Challengeを生成（SHA256ハッシュのBase64URL）
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
};

/**
 * Stateパラメータを生成（CSRF対策）
 */
export const generateState = (): string => {
  return crypto.randomBytes(32).toString("base64url");
};

/**
 * Nonceパラメータを生成（リプレイ攻撃対策）
 */
export const generateNonce = (): string => {
  return crypto.randomBytes(32).toString("base64url");
};

/**
 * セッションIDを生成
 */
export const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString("base64url");
};

/**
 * OAuth エラーコード
 */
export const OAuthErrorCodes = {
  // OAuth 2.0 標準エラー
  INVALID_REQUEST: "invalid_request",
  UNAUTHORIZED_CLIENT: "unauthorized_client",
  ACCESS_DENIED: "access_denied",
  UNSUPPORTED_RESPONSE_TYPE: "unsupported_response_type",
  INVALID_SCOPE: "invalid_scope",
  SERVER_ERROR: "server_error",
  TEMPORARILY_UNAVAILABLE: "temporarily_unavailable",

  // トークンエラー
  INVALID_CLIENT: "invalid_client",
  INVALID_GRANT: "invalid_grant",
  UNSUPPORTED_GRANT_TYPE: "unsupported_grant_type",

  // カスタムエラー
  DCR_FAILED: "dcr_failed",
  DISCOVERY_FAILED: "discovery_failed",
  TOKEN_REFRESH_FAILED: "token_refresh_failed",
  SESSION_EXPIRED: "session_expired",
  PKCE_VERIFICATION_FAILED: "pkce_verification_failed",
} as const;

/**
 * OAuthエラーを作成
 */
export const createOAuthError = (
  error: string,
  description?: string,
  uri?: string,
): OAuthError => {
  return {
    error,
    error_description: description,
    error_uri: uri,
  };
};

/**
 * リダイレクトURIを構築
 */
export const buildRedirectUri = (
  baseUrl: string,
  mcpServerId: string,
): string => {
  const url = new URL(baseUrl);
  // ベースURLの末尾スラッシュを正規化
  const cleanPath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${cleanPath}/oauth/callback/${mcpServerId}`;
  return url.toString();
};

/**
 * 認証URLを構築
 */
export const buildAuthorizationUrl = (
  authorizationEndpoint: string,
  params: {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope: string;
    state: string;
    code_challenge?: string;
    code_challenge_method?: string;
    nonce?: string;
    audience?: string;
    resource?: string;
    prompt?: string;
    login_hint?: string;
    max_age?: number;
  },
): string => {
  const url = new URL(authorizationEndpoint);

  (Object.entries(params) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    },
  );

  return url.toString();
};

/**
 * トークンリクエストボディを構築
 */
export const buildTokenRequestBody = (params: {
  grant_type: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
  audience?: string;
  resource?: string;
}): URLSearchParams => {
  const body = new URLSearchParams();

  (Object.entries(params) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value != null) {
        body.append(key, String(value));
      }
    },
  );

  return body;
};

/**
 * Basic認証ヘッダーを生成
 */
export const createBasicAuthHeader = (
  clientId: string,
  clientSecret: string,
): string => {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  return `Basic ${credentials}`;
};

/**
 * トークンの有効期限を計算
 */
export const calculateTokenExpiry = (expiresIn?: number): Date | undefined => {
  if (!expiresIn) {
    return undefined;
  }
  return new Date(Date.now() + expiresIn * 1000);
};

/**
 * スコープ文字列を配列に変換
 */
export const parseScopes = (scopeString?: string): string[] => {
  if (!scopeString) {
    return [];
  }
  return scopeString.split(" ").filter(Boolean);
};

/**
 * スコープ配列を文字列に変換（重複を除去）
 */
export const formatScopes = (scopes: string[]): string => {
  return Array.from(new Set(scopes)).join(" ");
};

/**
 * リトライ遅延計算用の定数
 */
const DEFAULT_RETRY_BASE_DELAY = 1000; // 1 second
const DEFAULT_RETRY_MAX_DELAY = 30000; // 30 seconds
const RETRY_JITTER_FACTOR = 0.1; // 10% jitter

/**
 * リトライ遅延を計算（指数バックオフ）
 */
export const calculateRetryDelay = (
  attempt: number,
  baseDelay = DEFAULT_RETRY_BASE_DELAY,
  maxDelay = DEFAULT_RETRY_MAX_DELAY,
): number => {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * RETRY_JITTER_FACTOR * delay;
  return Math.min(delay + jitter, maxDelay);
};

/**
 * エラーレスポンスをパース
 */
export const parseErrorResponse = (responseText: string): OAuthError => {
  try {
    const error = JSON.parse(responseText) as OAuthError;
    if (error.error) {
      return error;
    }
  } catch {
    // JSON parseに失敗した場合
  }

  return {
    error: OAuthErrorCodes.SERVER_ERROR,
    error_description: responseText || "Unknown error occurred",
  };
};

/**
 * URLから認証コードを抽出
 */
export const extractAuthorizationCode = (
  url: string,
): { code?: string; state?: string; error?: OAuthError } => {
  const parsedUrl = new URL(url);
  const params = parsedUrl.searchParams;

  // エラーレスポンスをチェック
  if (params.has("error")) {
    return {
      error: {
        error: params.get("error") ?? OAuthErrorCodes.SERVER_ERROR,
        error_description: params.get("error_description") ?? undefined,
        error_uri: params.get("error_uri") ?? undefined,
        state: params.get("state") ?? undefined,
      },
    };
  }

  // 成功レスポンス
  const code = params.get("code");
  const state = params.get("state");

  if (!code) {
    return {
      error: createOAuthError(
        OAuthErrorCodes.INVALID_REQUEST,
        "Authorization code not found in callback URL",
      ),
    };
  }

  return { code, state: state ?? undefined };
};

/**
 * セッションが有効かチェック
 */
export const isSessionValid = (expiresAt: Date): boolean => {
  return new Date() < expiresAt;
};

/**
 * トークンレスポンスを検証
 */
export const validateTokenResponse = (
  response: unknown,
): response is { access_token: string; token_type: string } => {
  return (
    typeof response === "object" &&
    response !== null &&
    typeof (response as Record<string, unknown>).access_token === "string" &&
    typeof (response as Record<string, unknown>).token_type === "string"
  );
};

/**
 * Authorization Serverのメタデータを検証
 */
export const validateAuthServerMetadata = (
  metadata: unknown,
): metadata is {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
} => {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    typeof (metadata as Record<string, unknown>).issuer === "string" &&
    typeof (metadata as Record<string, unknown>).authorization_endpoint ===
      "string" &&
    typeof (metadata as Record<string, unknown>).token_endpoint === "string"
  );
};

/**
 * スコープが要求されたスコープに含まれているかチェック
 */
export const hasRequiredScopes = (
  grantedScopes: string[],
  requiredScopes: string[],
): boolean => {
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
};

/**
 * OAuth認証フローのログを記録
 */
export const logOAuthFlow = (
  event: string,
  data: Record<string, unknown>,
): void => {
  console.log(`OAuth Flow: ${event}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};
