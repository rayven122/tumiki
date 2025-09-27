import type { AuthenticationError } from "../lib/errors/index.js";
import type { Result } from "../lib/result/index.js";
import type { GoogleAuth } from "./auth/index.js";
import type { DriveApi } from "./drive/index.js";
import type { SpreadsheetsApi } from "./spreadsheets/index.js";
import type { AuthConfig } from "./types.js";
import { err, ok } from "../lib/result/index.js";
import { createAuthClient } from "./auth/index.js";
import { createDriveApi } from "./drive/index.js";
import { createSpreadsheetsApi } from "./spreadsheets/index.js";

export const createGoogleSheetsClient = async (
  config: AuthConfig,
): Promise<Result<GoogleSheetsClient, AuthenticationError>> => {
  const authResult = await createAuthClient(config);
  if (!authResult.ok) {
    return err(authResult.error);
  }

  const auth = authResult.value;
  const spreadsheets = createSpreadsheetsApi(auth);
  const drive = createDriveApi(auth);

  return ok({
    auth,
    spreadsheets,
    drive,
    config,
  });
};

export type GoogleSheetsClient = {
  auth: GoogleAuth;
  spreadsheets: SpreadsheetsApi;
  drive: DriveApi;
  config: AuthConfig;
};

export * from "./types.js";
export * from "./auth/index.js";
export * from "./spreadsheets/index.js";
export * from "./drive/index.js";
