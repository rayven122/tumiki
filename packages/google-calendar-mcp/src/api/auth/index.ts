import { GoogleAuth } from "google-auth-library";

import type { Result } from "../../lib/result.js";
import type { AuthConfig } from "../types.js";
import { AuthenticationError } from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result.js";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.settings.readonly",
];

export const createAuthClient = async (
  config: AuthConfig,
): Promise<Result<GoogleAuth, AuthenticationError>> => {
  try {
    let auth: GoogleAuth;

    switch (config.type) {
      case "service-account": {
        auth = new GoogleAuth({
          credentials: config.credentials,
          scopes: SCOPES,
        });
        break;
      }

      case "oauth2": {
        auth = new GoogleAuth({
          credentials: {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
            type: "authorized_user",
          },
          scopes: SCOPES,
        });
        break;
      }

      case "api-key": {
        auth = new GoogleAuth({
          keyFile: undefined,
          scopes: SCOPES,
        });
        auth.apiKey = config.apiKey;
        break;
      }

      case "adc": {
        auth = new GoogleAuth({
          scopes: SCOPES,
        });
        break;
      }

      default: {
        return err(
          new AuthenticationError("Unsupported authentication configuration"),
        );
      }
    }

    // Test authentication by getting credentials
    const client = await auth.getClient();
    if (!client) {
      return err(new AuthenticationError("Failed to create auth client"));
    }

    return ok(auth);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown authentication error";
    return err(new AuthenticationError(`Authentication failed: ${message}`));
  }
};

export { GoogleAuth };
