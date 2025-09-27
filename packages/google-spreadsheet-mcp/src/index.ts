#!/usr/bin/env node
import dotenv from "dotenv";

import type { AuthConfig } from "./api/types.js";
import { runServer } from "./mcp/index.js";

// Load environment variables
dotenv.config();

const getAuthConfig = (): AuthConfig => {
  // Check for Service Account credentials
  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      return {
        type: "service-account",
        credentials,
      };
    } catch {
      console.error(
        "Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: Invalid JSON format",
      );
    }
  }

  // Check for OAuth2 credentials
  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
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
  // eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties
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

const main = async () => {
  try {
    const config = getAuthConfig();
    await runServer(config);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

main().catch(console.error);
