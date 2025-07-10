import { getAuth0Config, getAuth0Endpoints } from "./auth0Config.js";
import { logger } from "./logger.js";

export interface M2MTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface M2MAuthConfig {
  clientId: string;
  clientSecret: string;
  audience: string;
  scope?: string;
}

// Token cache interface
interface TokenCache {
  token: string;
  expiresAt: number;
  scope?: string;
}

// Simple in-memory token cache
const tokenCache = new Map<string, TokenCache>();

/**
 * Generate cache key for token
 */
const generateCacheKey = (clientId: string, audience: string, scope?: string): string => {
  return `${clientId}:${audience}:${scope || ""}`;
};

/**
 * Check if cached token is still valid
 */
const isCachedTokenValid = (cache: TokenCache): boolean => {
  // Add 60 second buffer to prevent expiry during request
  return Date.now() < (cache.expiresAt - 60000);
};

/**
 * Get access token using Client Credentials flow
 */
export const getM2MToken = async (config?: Partial<M2MAuthConfig>): Promise<string> => {
  const auth0Config = getAuth0Config();
  
  if (!auth0Config) {
    throw new Error("Auth0 configuration not available");
  }

  const clientId = config?.clientId || auth0Config.clientId;
  const clientSecret = config?.clientSecret || auth0Config.clientSecret;
  const audience = config?.audience || auth0Config.audience;
  const scope = config?.scope || auth0Config.scope;

  if (!clientId || !clientSecret || !audience) {
    throw new Error("Missing required parameters for M2M authentication: clientId, clientSecret, audience");
  }

  // Check cache first
  const cacheKey = generateCacheKey(clientId, audience, scope);
  const cachedToken = tokenCache.get(cacheKey);
  
  if (cachedToken && isCachedTokenValid(cachedToken)) {
    logger.debug("Using cached M2M token", {
      clientId,
      audience,
      expiresAt: new Date(cachedToken.expiresAt).toISOString(),
    });
    return cachedToken.token;
  }

  try {
    const endpoints = getAuth0Endpoints(auth0Config.domain);
    
    const tokenRequest = {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: audience,
      ...(scope && { scope }),
    };

    logger.debug("Requesting M2M token from Auth0", {
      clientId,
      audience,
      scope,
      endpoint: endpoints.token,
    });

    const response = await fetch(endpoints.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("M2M token request failed", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        clientId,
        audience,
      });
      throw new Error(`Failed to get M2M token: ${response.status} ${response.statusText}`);
    }

    const tokenResponse = await response.json() as M2MTokenResponse;

    // Cache the token
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
    tokenCache.set(cacheKey, {
      token: tokenResponse.access_token,
      expiresAt,
      scope: tokenResponse.scope,
    });

    logger.info("M2M token obtained successfully", {
      clientId,
      audience,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
    });

    return tokenResponse.access_token;
  } catch (error) {
    logger.error("Error obtaining M2M token", {
      error: error instanceof Error ? error.message : String(error),
      clientId,
      audience,
    });
    throw error;
  }
};

/**
 * Clear cached token for specific client/audience
 */
export const clearM2MTokenCache = (clientId: string, audience: string, scope?: string): void => {
  const cacheKey = generateCacheKey(clientId, audience, scope);
  tokenCache.delete(cacheKey);
  
  logger.debug("Cleared M2M token cache", {
    clientId,
    audience,
    scope,
  });
};

/**
 * Clear all cached tokens
 */
export const clearAllM2MTokenCache = (): void => {
  tokenCache.clear();
  logger.debug("Cleared all M2M token cache");
};

/**
 * Get cached token info (for debugging)
 */
export const getCachedTokenInfo = (clientId: string, audience: string, scope?: string) => {
  const cacheKey = generateCacheKey(clientId, audience, scope);
  const cachedToken = tokenCache.get(cacheKey);
  
  if (!cachedToken) {
    return null;
  }

  return {
    hasToken: !!cachedToken.token,
    expiresAt: new Date(cachedToken.expiresAt).toISOString(),
    isValid: isCachedTokenValid(cachedToken),
    scope: cachedToken.scope,
  };
};

/**
 * Create M2M authentication headers
 */
export const createM2MHeaders = async (config?: Partial<M2MAuthConfig>): Promise<{ Authorization: string }> => {
  const token = await getM2MToken(config);
  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Validate M2M configuration
 */
export const validateM2MConfig = (config?: Partial<M2MAuthConfig>): boolean => {
  const auth0Config = getAuth0Config();
  
  if (!auth0Config) {
    return false;
  }

  const clientId = config?.clientId || auth0Config.clientId;
  const clientSecret = config?.clientSecret || auth0Config.clientSecret;
  const audience = config?.audience || auth0Config.audience;

  return !!(clientId && clientSecret && audience);
};