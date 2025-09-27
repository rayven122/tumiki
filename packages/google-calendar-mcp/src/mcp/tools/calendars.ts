import type { GoogleCalendarClient } from "../../api/index.js";
import type { CalendarError } from "../../lib/errors/index.js";
import type { Result } from "../../lib/result/index.js";
import type { GetCalendarInput, ListCalendarsInput } from "../types.js";
import { err, ok } from "../../lib/result/index.js";

export const listCalendars = async (
  client: GoogleCalendarClient,
  input: ListCalendarsInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.calendar.listCalendars({
    maxResults: input.maxResults,
    pageToken: input.pageToken,
    showDeleted: input.showDeleted,
    showHidden: input.showHidden,
  });

  if (!result.ok) {
    return err(result.error);
  }

  return ok({
    calendars: result.value.calendars,
    nextPageToken: result.value.nextPageToken,
    totalCalendars: result.value.calendars.length,
  });
};

export const getCalendar = async (
  client: GoogleCalendarClient,
  input: GetCalendarInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.calendar.getCalendar(input.calendarId);

  if (!result.ok) {
    return err(result.error);
  }

  return ok(result.value);
};
