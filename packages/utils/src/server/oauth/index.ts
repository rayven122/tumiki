/**
 * OAuth Module Index
 * OAuth認証関連のエクスポート（共通パッケージ）
 */

// DCR Client functions
export {
  parseWWWAuthenticate,
  discoverProtectedResource,
  discoverAuthServer,
  registerClient,
  updateClient,
  getClient,
  deleteClient,
} from "./dcrClient.js";

// Token Manager functions
export {
  saveToken,
  getValidToken,
  refreshToken,
  invalidateToken,
  revokeToken,
  cleanupExpiredTokens,
} from "./tokenManager.js";

// Utility functions
export {
  generatePKCE,
  generateState,
  generateNonce,
  generateSessionId,
  OAuthErrorCodes,
  createOAuthError,
  buildRedirectUri,
  buildAuthorizationUrl,
  buildTokenRequestBody,
  createBasicAuthHeader,
  calculateTokenExpiry,
  parseScopes,
  formatScopes,
  calculateRetryDelay,
  parseErrorResponse,
  extractAuthorizationCode,
  isSessionValid,
  validateTokenResponse,
  validateAuthServerMetadata,
  hasRequiredScopes,
  logOAuthFlow,
} from "./utils.js";

// OAuth Manager
export {
  authenticate,
  handleCallback,
  refreshToken as refreshOAuthToken,
  revokeToken as revokeOAuthToken,
  handleWWWAuthenticateChallenge,
  createOAuthManager,
} from "./oauthManager.js";

// Error Handler
export {
  isRetryableError,
  isOAuthError,
  toOAuthError,
  calculateExponentialBackoff,
  withRetry,
  CircuitState,
  CircuitBreaker,
  getCircuitBreaker,
  withCircuitBreakerAndRetry,
} from "./errorHandler.js";

// Types
export type {
  AuthServerMetadata,
  ProtectedResourceMetadata,
  ClientMetadata,
  ClientCredentials,
  TokenResponse,
  TokenData,
  PKCEChallenge,
  OAuthError,
  OAuthSessionData,
  OAuthConfig,
  WWWAuthenticateChallenge,
  OAuthFlowType,
  OAuthAuthResult,
  DCRClientOptions,
  TokenManagerOptions,
} from "./types.js";
