import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import type { AuthConfig, ServiceAccountCredentials } from "../types.js";
import { AuthenticationError } from "../../lib/errors/index.js";
import type { Result } from "../../lib/result/index.js";
import { err, ok } from "../../lib/result/index.js";

export type GoogleAuth = OAuth2Client | ReturnType<typeof google.auth.fromJSON>;

export const createAuthClient = async (
  config: AuthConfig,
): Promise<Result<GoogleAuth, AuthenticationError>> => {
  try {
    switch (config.type) {
      case "service-account":
        return ok(createServiceAccountAuth(config.credentials));

      case "oauth2":
        return ok(
          createOAuth2Auth(
            config.clientId,
            config.clientSecret,
            config.refreshToken,
          ),
        );

      case "api-key":
        return err(
          new AuthenticationError(
            "API Key authentication is not supported for write operations",
          ),
        );

      case "adc":
        return await createADCAuth();

      default:
        return err(new AuthenticationError(`Unknown authentication type`));
    }
  } catch (error) {
    return err(
      new AuthenticationError(
        `Failed to create auth client: ${error instanceof Error ? error.message : String(error)}`,
        error,
      ),
    );
  }
};

const createServiceAccountAuth = (
  credentials: ServiceAccountCredentials,
): GoogleAuth => {
  return google.auth.fromJSON(credentials as any);
};

const createOAuth2Auth = (
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): OAuth2Client => {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob",
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

const createADCAuth = async (): Promise<
  Result<GoogleAuth, AuthenticationError>
> => {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const client = await auth.getClient();
    return ok(client as OAuth2Client);
  } catch (error) {
    return err(
      new AuthenticationError(
        `Failed to get Application Default Credentials: ${error instanceof Error ? error.message : String(error)}`,
        error,
      ),
    );
  }
};

export const getApiKeyAuth = (apiKey: string): string => {
  if (!apiKey || apiKey.trim() === "") {
    throw new AuthenticationError("API Key is required");
  }
  return apiKey;
};
