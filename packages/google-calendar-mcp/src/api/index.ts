import type { AuthenticationError } from "../lib/errors/index.js";
import type { Result } from "../lib/result/index.js";
import type { AuthConfig } from "./types.js";
import { err, ok } from "../lib/result/index.js";
import { createAuthClient } from "./auth/index.js";
import { createCalendarApi } from "./calendar/index.js";

/**
 * Creates a Google Calendar client with functional programming approach.
 * @param config - Authentication configuration
 * @returns Promise resolving to Result containing the calendar API functions or error
 */
export const createGoogleCalendarClient = async (
  config: AuthConfig,
): Promise<
  Result<ReturnType<typeof createCalendarApi>, AuthenticationError>
> => {
  const authResult = await createAuthClient(config);
  if (!authResult.ok) {
    return err(authResult.error);
  }

  const calendarApi = createCalendarApi({ auth: authResult.value });
  return ok(calendarApi);
};

export * from "./types.js";
export * from "./auth/index.js";
export * from "./calendar/index.js";
