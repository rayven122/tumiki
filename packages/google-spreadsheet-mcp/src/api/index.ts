import type { AuthenticationError } from "../lib/errors/index.js";
import type { Result } from "../lib/result/index.js";
import type { GoogleAuth } from "./auth/index.js";
import type { AuthConfig } from "./types.js";
import { err } from "../lib/result/index.js";
import { createAuthClient } from "./auth/index.js";
import { DriveApi } from "./drive/index.js";
import { SpreadsheetsApi } from "./spreadsheets/index.js";

export class GoogleSheetsClient {
  private auth: GoogleAuth | null = null;
  private spreadsheetsApi: SpreadsheetsApi | null = null;
  private driveApi: DriveApi | null = null;

  constructor(private config: AuthConfig) {}

  async initialize(): Promise<Result<void, AuthenticationError>> {
    const authResult = await createAuthClient(this.config);
    if (!authResult.ok) {
      return err(authResult.error);
    }

    this.auth = authResult.value;
    this.spreadsheetsApi = new SpreadsheetsApi(this.auth);
    this.driveApi = new DriveApi(this.auth);

    return { ok: true, value: undefined };
  }

  get spreadsheets(): SpreadsheetsApi {
    if (!this.spreadsheetsApi) {
      throw new Error("Client not initialized. Call initialize() first.");
    }
    return this.spreadsheetsApi;
  }

  get drive(): DriveApi {
    if (!this.driveApi) {
      throw new Error("Client not initialized. Call initialize() first.");
    }
    return this.driveApi;
  }
}

export * from "./types.js";
export * from "./auth/index.js";
export * from "./spreadsheets/index.js";
export * from "./drive/index.js";
