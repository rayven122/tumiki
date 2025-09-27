import type { JWT, OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import type { Result } from "../../lib/result/index.js";
import type { AuthConfig, ServiceAccountCredentials } from "../types.js";

/*
 * Google認証関連のany型使用について：
 *
 * google.auth.fromJSON() の戻り値型が google-auth-library で完全に型定義されていないため、
 * 必要最小限の any型を使用しています。詳細は drive/index.ts のコメントを参照してください。
 */
import { AuthenticationError } from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result/index.js";

export type GoogleAuth = OAuth2Client | JWT;

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
  // Google API の fromJSON の戻り値型が不明確なため any を使用
  // google-auth-library の型定義の制限による必要な型キャスト
  const auth = google.auth.fromJSON(credentials as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  return auth as GoogleAuth;
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
    return ok(client as GoogleAuth);
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
