import type {
  AuthType,
  PiiMaskingMode,
  AuthContext,
} from "../../domain/types/authContext.js";

// 後方互換性のためリエクスポート
export type { AuthType, PiiMaskingMode, AuthContext };

/**
 * JWT ペイロード（Keycloak OAuth 認証）
 *
 * Keycloakのカスタムクレームは `tumiki` ネームスペース内に格納される
 */
export type JWTPayload = {
  sub?: string; // ユーザーID（Keycloak Subject）- 一部のKeycloak設定では未定義の場合あり
  tumiki?: {
    org_id?: string; // 組織ID（Organization.id）
  };
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
 * OAuth 認証情報
 */
export type OAuthAuthInfo = {
  clientId: string;
  organizationId: string;
  instanceId: string;
  scope?: string;
};

/**
 * OAuth エラーレスポンス（RFC 6749準拠）
 */
export type OAuthErrorResponse = {
  error:
    | "invalid_request"
    | "invalid_client"
    | "invalid_grant"
    | "unauthorized_client"
    | "unsupported_grant_type"
    | "invalid_scope"
    | "server_error";
  error_description?: string;
};

/**
 * OAuth トークンレスポンス（RFC 6749準拠）
 */
export type OAuthTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

/**
 * DCR リクエスト（RFC 7591準拠）
 *
 * Dynamic Client Registration Protocol で使用するクライアント登録リクエスト
 */
export type DCRRequest = {
  redirect_uris: string[];
  client_name?: string;
  token_endpoint_auth_method?:
    | "client_secret_post"
    | "client_secret_basic"
    | "none";
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  contacts?: string[];
  logo_uri?: string;
  client_uri?: string;
  policy_uri?: string;
  tos_uri?: string;
};

/**
 * DCR レスポンス（RFC 7591準拠）
 *
 * Dynamic Client Registration Protocol で返却されるクライアント情報
 */
export type DCRResponse = {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  registration_access_token?: string;
  registration_client_uri?: string;
} & DCRRequest;

/**
 * DCR エラーレスポンス（RFC 7591準拠）
 */
export type DCRErrorResponse = {
  error:
    | "invalid_redirect_uri"
    | "invalid_client_metadata"
    | "invalid_software_statement"
    | "unapproved_software_statement";
  error_description?: string;
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
    oauthAuthInfo?: OAuthAuthInfo; // OAuth認証時のみ
  };
};
