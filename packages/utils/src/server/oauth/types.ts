/**
 * OAuth認証関連の型定義（共通）
 *
 * このファイルでは主にRFC標準の型定義を提供し、
 * Prismaスキーマで定義されているものは@tumiki/dbから再エクスポートします。
 */

// Prisma generated types
export type { OAuthClient, OAuthToken, OAuthSession } from "@tumiki/db";

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 */
export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  service_documentation?: string;
  ui_locales_supported?: string[];
  op_policy_uri?: string;
  op_tos_uri?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  code_challenge_methods_supported?: string[];
  // Dynamic Client Registration
  client_registration_types_supported?: string[];
  // Additional endpoints
  device_authorization_endpoint?: string;
  pushed_authorization_request_endpoint?: string;
}

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728)
 */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  bearer_methods_supported?: string[];
  resource_documentation?: string;
  resource_signing_alg_values_supported?: string[];
  scopes_supported?: string[];
  // MCP specific
  mcp_version?: string;
  mcp_features?: string[];
}

/**
 * Dynamic Client Registration Request (RFC 7591)
 */
export interface ClientMetadata {
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  software_id?: string;
  software_version?: string;
  // MCP specific
  mcp_server_id?: string;
  mcp_server_name?: string;
}

/**
 * Dynamic Client Registration Response
 */
export interface ClientCredentials {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  registration_access_token?: string;
  registration_client_uri?: string;
  // Include all metadata from request
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
}

/**
 * OAuth Token Response (RFC 6749)
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  // Additional fields
  refresh_expires_in?: number;
  not_before_policy?: number;
  session_state?: string;
}

/**
 * Token Data for storage
 *
 * Note: OAuthTokenからPrisma生成型を使用することを推奨しますが、
 * 下位互換性のためこの型定義も残しています。
 */
export interface TokenData {
  userMcpConfigId: string;
  oauthClientId: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  scope?: string;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
}

/**
 * PKCE (RFC 7636) Challenge
 */
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256" | "plain";
}

/**
 * OAuth Error Response (RFC 6749)
 */
export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

/**
 * OAuth Session Data
 *
 * Note: OAuthSessionからPrisma生成型を使用することを推奨しますが、
 * 下位互換性のためこの型定義も残しています。
 */
export interface OAuthSessionData {
  sessionId: string;
  userId: string;
  mcpServerId: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  nonce?: string;
  redirectUri: string;
  requestedScopes: string[];
  status: "pending" | "completed" | "failed" | "expired";
  expiresAt: Date;
}

/**
 * OAuth Manager Configuration
 */
export interface OAuthConfig {
  callbackBaseUrl: string;
  sessionTimeout: number; // in seconds
  tokenRefreshBuffer: number; // refresh token X seconds before expiry
  maxRetries: number;
  retryDelay: number; // initial delay in ms
  enablePKCE: boolean;
  enableDCR: boolean;
}

/**
 * WWW-Authenticate Header Parser Result
 */
export interface WWWAuthenticateChallenge {
  scheme: string;
  realm?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
  // OAuth 2.0 Bearer Token Usage (RFC 6750)
  authorizationUri?: string;
  tokenUri?: string;
  // Protected Resource Metadata
  resource?: string;
  as_uri?: string; // Authorization Server URI
}

/**
 * OAuth Flow Type
 */
export type OAuthFlowType =
  | "authorization_code"
  | "client_credentials"
  | "refresh_token"
  | "device_code";

/**
 * OAuth Authentication Result
 */
export interface OAuthAuthResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: OAuthError;
  requiresUserInteraction?: boolean;
  authorizationUrl?: string;
}

/**
 * DCR Client Options
 */
export interface DCRClientOptions {
  userAgent?: string;
  timeout?: number;
}

/**
 * Token Manager Options
 */
export interface TokenManagerOptions {
  tokenRefreshBuffer?: number; // seconds before expiry to refresh
  maxRetries?: number;
  retryDelay?: number; // initial retry delay in ms
}
