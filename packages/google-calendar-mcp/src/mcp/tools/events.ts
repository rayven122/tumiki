import type { createCalendarApi } from "../../api/index.js";
import type { CalendarError } from "../../lib/errors/index.js";
import type { Result } from "../../lib/result/index.js";
import type {
  CreateEventInput,
  DeleteEventInput,
  GetEventInput,
  GetFreeBusyInput,
  ListEventsInput,
  SearchEventsInput,
  UpdateEventInput,
} from "../types.js";
import { err, ok } from "../../lib/result/index.js";

export const listEvents = async (
  client: ReturnType<typeof createCalendarApi>,
  input: ListEventsInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.listEvents(input.calendarId, {
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    maxResults: input.maxResults,
    pageToken: input.pageToken,
    q: input.q,
    singleEvents: input.singleEvents,
    orderBy: input.orderBy,
    showDeleted: input.showDeleted,
  });

  if (!result.ok) {
    return err(result.error);
  }

  return ok({
    events: result.value.events,
    nextPageToken: result.value.nextPageToken,
    totalEvents: result.value.events.length,
  });
};

export const getEvent = async (
  client: ReturnType<typeof createCalendarApi>,
  input: GetEventInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.getEvent(input.calendarId, input.eventId);

  if (!result.ok) {
    return err(result.error);
  }

  return ok(result.value);
};

export const createEvent = async (
  client: ReturnType<typeof createCalendarApi>,
  input: CreateEventInput,
): Promise<Result<unknown, CalendarError>> => {
  const { calendarId, sendNotifications, sendUpdates, ...eventData } = input;

  const result = await client.createEvent(calendarId, eventData, {
    sendNotifications,
    sendUpdates,
  });

  if (!result.ok) {
    return err(result.error);
  }

  return ok(result.value);
};

export const updateEvent = async (
  client: ReturnType<typeof createCalendarApi>,
  input: UpdateEventInput,
): Promise<Result<unknown, CalendarError>> => {
  const { calendarId, eventId, sendNotifications, sendUpdates, ...eventData } =
    input;

  const result = await client.updateEvent(calendarId, eventId, eventData, {
    sendNotifications,
    sendUpdates,
  });

  if (!result.ok) {
    return err(result.error);
  }

  return ok(result.value);
};

export const deleteEvent = async (
  client: ReturnType<typeof createCalendarApi>,
  input: DeleteEventInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.deleteEvent(input.calendarId, input.eventId, {
    sendNotifications: input.sendNotifications,
    sendUpdates: input.sendUpdates,
  });

  if (!result.ok) {
    return err(result.error);
  }

  return ok({ success: true, message: "Event deleted successfully" });
};

export const searchEvents = async (
  client: ReturnType<typeof createCalendarApi>,
  input: SearchEventsInput,
): Promise<Result<unknown, CalendarError>> => {
  const result = await client.listEvents(input.calendarId, {
    q: input.q,
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    maxResults: input.maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  if (!result.ok) {
    return err(result.error);
  }

  return ok({
    events: result.value.events,
    totalEvents: result.value.events.length,
    searchQuery: input.q,
  });
};

export const getFreeBusy = async (
  client: ReturnType<typeof createCalendarApi>,
  input: GetFreeBusyInput,
): Promise<Result<unknown, CalendarError>> => {
  const freeBusyRequest = {
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    timeZone: input.timeZone,
    items: input.calendarIds.map((id) => ({ id })),
  };

  const result = await client.getFreeBusy(freeBusyRequest);

  if (!result.ok) {
    return err(result.error);
  }

  return ok(result.value);
};
