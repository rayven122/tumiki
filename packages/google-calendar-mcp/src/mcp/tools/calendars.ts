import type { createCalendarApi } from "../../api/index.js";
import type { CalendarError } from "../../lib/errors/index.js";
import type { Result } from "../../lib/result.js";
import type { GetCalendarInput, ListCalendarsInput } from "../types.js";
import { err, ok } from "../../lib/result.js";

export const listCalendars = async (
  client: ReturnType<typeof createCalendarApi>,
  input: ListCalendarsInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.listCalendars({
    maxResults: input.maxResults,
    pageToken: input.pageToken,
    showDeleted: input.showDeleted,
    showHidden: input.showHidden,
  });

  if (!result.success) {
    return err(result.error);
  }

  return ok({
    calendars: result.data.calendars,
    nextPageToken: result.data.nextPageToken,
    totalCalendars: result.data.calendars.length,
  });
};

export const getCalendar = async (
  client: ReturnType<typeof createCalendarApi>,
  input: GetCalendarInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.getCalendar(input.calendarId);

  if (!result.success) {
    return err(result.error);
  }

  return ok(result.data);
};
