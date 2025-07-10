import { logger } from "./logger.js";

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  scope?: string;
  secret?: string;
  baseUrl?: string;
}

/**
 * Get Auth0 configuration from environment variables
 */
export const getAuth0Config = (): Auth0Config | null => {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID || process.env.MCP_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const audience = process.env.AUTH0_AUDIENCE;
  const scope = process.env.AUTH0_SCOPE;
  const secret = process.env.AUTH0_SECRET;
  const baseUrl = process.env.APP_BASE_URL;

  if (!domain || !clientId || !clientSecret) {
    logger.info("Auth0 configuration not complete - OAuth authentication will be disabled", {
      hasDomain: !!domain,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    return null;
  }

  // Ensure domain is properly formatted
  const formattedDomain = domain.startsWith("https://") 
    ? domain 
    : `https://${domain}`;

  return {
    domain: formattedDomain,
    clientId,
    clientSecret,
    audience: audience || `${formattedDomain}/api/v2/`,
    scope: scope || "openid profile email offline_access",
    secret,
    baseUrl: baseUrl || "http://localhost:8080",
  };
};

/**
 * Auth0 endpoints
 */
export const getAuth0Endpoints = (domain: string) => {
  return {
    authorize: `${domain}/authorize`,
    token: `${domain}/oauth/token`,
    userinfo: `${domain}/userinfo`,
    jwks: `${domain}/.well-known/jwks.json`,
    metadata: `${domain}/.well-known/openid-configuration`,
    logout: `${domain}/v2/logout`,
  };
};