import type { AuthType } from "@tumiki/db";

export type { AuthType };

/**
 * 統一認証コンテキスト
 *
 * 認証ミドルウェア通過後に必ず設定される共通の認証情報。
 * JWT認証とAPI Key認証の両方をサポートし、利用側は認証方式を
 * 意識せずに必要な情報を取得できる。
 */
export type AuthContext = {
  authMethod: AuthType;
  organizationId: string;
  userId: string;
  mcpApiKeyId?: string; // API Key認証時のみ
};

/**
 * JWT ペイロード（Keycloak OAuth 認証）
 */
export type JWTPayload = {
  sub: string; // ユーザーID（Keycloak Subject）
  org_id: string; // 組織ID（Organization.id）
  azp?: string; // クライアントID (authorized party)
  scope?: string; // スコープ（スペース区切り）
  email?: string; // メールアドレス
  name?: string; // ユーザー名
  preferred_username?: string; // ユーザー名
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  iat?: number; // 発行時刻
  exp?: number; // 有効期限
  iss?: string; // Issuer
  aud?: string | string[]; // Audience
};

/**
 * Remote MCP サーバー設定型
 */
export type RemoteMcpServerConfig = {
  enabled: boolean;
  name: string;
  url: string;
  transportType?: "sse" | "http" | "stdio"; // SSE（デフォルト）、HTTP、Stdio
  authType: "none" | "bearer" | "api_key";
  authToken?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
};

/**
 * Hono 環境型定義
 *
 * コンテキストの型安全性を提供
 *
 * - JWT認証時: jwtPayload のみ設定、authMethod = "jwt"
 * - API Key認証時: authContext のみ設定、authMethod = "apikey"
 */
export type HonoEnv = {
  Variables: {
    authMethod?: AuthType; // 使用された認証方式
    jwtPayload?: JWTPayload; // JWT認証時のみ
    authContext?: AuthContext; // 統一認証コンテキスト
  };
};
