/**
 * Minimal OAuth Utilities
 * openid-clientで置き換えられない最小限のユーティリティ関数
 */

import type { OAuthError } from "./types.js";

/**
 * OAuth エラーコード定数
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
  SESSION_EXPIRED: "session_expired",
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
 * セッションIDを生成（crypto.randomBytesの代替）
 */
export const generateSessionId = (): string => {
  // openid-clientのrandomState()を利用
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * リダイレクトURIを構築
 */
export const buildRedirectUri = (
  baseUrl: string,
  mcpServerId: string,
): string => {
  const url = new URL(baseUrl);
  const cleanPath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${cleanPath}/oauth/callback/${mcpServerId}`;
  return url.toString();
};

/**
 * トークンの有効期限を計算
 */
export const calculateTokenExpiry = (expiresIn: number): Date => {
  return new Date(Date.now() + expiresIn * 1000);
};

/**
 * セッションの有効性をチェック
 */
export const isSessionValid = (session: {
  expiresAt: Date;
  status: string;
}): boolean => {
  return session.status === "pending" && session.expiresAt > new Date();
};

/**
 * OAuthフローのログ出力（デバッグ用）
 */
export const logOAuthFlow = (
  message: string,
  context?: Record<string, unknown>,
): void => {
  console.log(`OAuth Flow: ${message}`, {
    ...context,
    timestamp: new Date().toISOString(),
  });
};
