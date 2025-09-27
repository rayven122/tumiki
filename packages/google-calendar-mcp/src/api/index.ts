import type { AuthenticationError } from "../lib/errors/index.js";
import type { Result } from "../lib/result/index.js";
import type { GoogleAuth } from "./auth/index.js";
import type { AuthConfig } from "./types.js";
import { err } from "../lib/result/index.js";
import { createAuthClient } from "./auth/index.js";
import { CalendarApi } from "./calendar/index.js";

export class GoogleCalendarClient {
  private auth: GoogleAuth | null = null;
  private calendarApi: CalendarApi | null = null;

  constructor(private config: AuthConfig) {}

  async initialize(): Promise<Result<void, AuthenticationError>> {
    const authResult = await createAuthClient(this.config);
    if (!authResult.ok) {
      return err(authResult.error);
    }

    this.auth = authResult.value;
    this.calendarApi = new CalendarApi(this.auth);

    return { ok: true, value: undefined };
  }

  get calendar(): CalendarApi {
    if (!this.calendarApi) {
      throw new Error("Client not initialized. Call initialize() first.");
    }
    return this.calendarApi;
  }
}

export * from "./types.js";
export * from "./auth/index.js";
export * from "./calendar/index.js";
