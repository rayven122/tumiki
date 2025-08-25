/**
 * OAuth Module Index - Simplified with openid-client
 * openid-clientライブラリを使用した簡略化されたOAuth実装
 */

// Main OpenID Client implementation
export {
  // Re-export from openid-client
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

  // Custom implementations
  saveTokenToDb,
  getValidTokenFromDb,
  isOAuth2Error,
  convertToTokenResponse,
} from "./openidClient.js";

// DCR Client exports
export {
  performDynamicClientRegistration,
  getExistingConfiguration,
  parseWWWAuthenticate,
  getExistingClient,
} from "./dcrClient.js";

// Token Manager exports
export {
  saveToken,
  getValidToken,
  invalidateToken,
  deleteToken,
  invalidateAllUserTokens,
  invalidateMcpServerTokens,
  clearTokenCache,
  convertFromTokenEndpointResponse,
} from "./tokenManager.js";

// OAuth Manager exports
export {
  startOAuthFlow,
  handleOAuthCallback,
  refreshOAuthToken,
  revokeOAuthToken,
  validateOAuthConfig,
} from "./oauthManager.js";

// Error Handler exports
export {
  classifyError,
  createRetryPolicy,
  createCircuitBreakerPolicy,
  createCombinedPolicy,
  executeWithErrorHandling,
  getUserFriendlyErrorMessage,
  structureErrorLog,
  createErrorResponse,
  isOAuthError,
  toOAuthError,
} from "./errorHandler.js";

// Minimal utilities that can't be replaced by openid-client
export {
  OAuthErrorCodes,
  createOAuthError,
  generateSessionId,
  buildRedirectUri,
  calculateTokenExpiry,
  isSessionValid,
  logOAuthFlow,
} from "./minimalUtils.js";

// Types (keep all existing types for compatibility)
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
  OAuthToken,
} from "./types.js";

// Re-export openid-client types for convenience
export type {
  Configuration,
  ServerMetadata,
  TokenEndpointResponse,
  IntrospectionResponse,
  ClientAuth,
  ModifyAssertionOptions,
  DPoPOptions,
} from "openid-client";

/**
 * Legacy createOAuthManager for backward compatibility
 * 新しい実装（oauthManager.ts）の使用を推奨
 */
export const createOAuthManager = async (config: {
  callbackBaseUrl: string;
  enablePKCE?: boolean;
  enableDCR?: boolean;
}) => {
  // Import from oauthManager
  const {
    startOAuthFlow,
    handleOAuthCallback,
    refreshOAuthToken,
    revokeOAuthToken,
  } = await import("./oauthManager.js");

  return {
    authenticate: async (
      mcpServerId: string,
      userId: string,
      mcpServerUrl: string,
      wwwAuthenticateHeader?: string,
    ) => {
      return startOAuthFlow(
        mcpServerId,
        userId,
        mcpServerUrl,
        wwwAuthenticateHeader,
        {
          callbackBaseUrl: config.callbackBaseUrl,
          enablePKCE: config.enablePKCE ?? true,
          enableDCR: config.enableDCR ?? true,
        },
      );
    },

    handleCallback: async (
      code: string,
      state: string,
      error?: string,
      errorDescription?: string,
    ) => {
      return handleOAuthCallback(code, state, error, errorDescription);
    },

    refreshToken: async (userMcpConfigId: string) => {
      const token = await refreshOAuthToken(userMcpConfigId);
      return token ?? "";
    },

    revokeToken: async (userMcpConfigId: string) => {
      await revokeOAuthToken(userMcpConfigId);
    },
  };
};
