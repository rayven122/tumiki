import type { JWTInput } from "google-auth-library";

import type { AuthConfig } from "../api/types.js";

/**
 * Retrieves authentication configuration from environment variables.
 * Prioritizes Service Account > OAuth2 > API Key > ADC (Application Default Credentials)
 *
 * @returns AuthConfig object with the appropriate authentication method
 * @throws Error if GOOGLE_SERVICE_ACCOUNT_KEY is invalid JSON
 */
export const getAuthConfig = (): AuthConfig => {
  // Check for Service Account credentials
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey) as JWTInput;
      return {
        type: "service-account",
        credentials,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${message}`);
    }
  }

  // Check for OAuth2 credentials
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    return {
      type: "oauth2",
      clientId,
      clientSecret,
      refreshToken,
    };
  }

  // Check for API Key (limited functionality)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return {
      type: "api-key",
      apiKey,
    };
  }

  // Default to Application Default Credentials
  console.error(
    "No explicit credentials provided, using Application Default Credentials",
  );
  return {
    type: "adc",
  };
};