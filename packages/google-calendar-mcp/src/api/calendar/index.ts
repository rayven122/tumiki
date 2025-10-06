import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";

import type { Result } from "../../lib/result.js";
import type { GoogleAuth } from "../auth/index.js";
import type {
  CalendarColors,
  CalendarEvent,
  CalendarListEntry,
  FreeBusyRequest,
  FreeBusyResponse,
} from "../types.js";
import {
  ApiError,
  CalendarError,
  CalendarNotFoundError,
  EventNotFoundError,
  PermissionDeniedError,
  QuotaExceededError,
  ValidationError,
} from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result.js";

export type CalendarApiConfig = {
  auth: GoogleAuth;
};

export type ListCalendarsOptions = {
  maxResults?: number;
  pageToken?: string;
  showDeleted?: boolean;
  showHidden?: boolean;
  syncToken?: string;
};

export type ListEventsOptions = {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  pageToken?: string;
  q?: string;
  singleEvents?: boolean;
  orderBy?: "startTime" | "updated";
  showDeleted?: boolean;
  syncToken?: string;
};

export type CreateEventOptions = {
  conferenceDataVersion?: number;
  maxAttendees?: number;
  sendNotifications?: boolean;
  sendUpdates?: "all" | "externalOnly" | "none";
  supportsAttachments?: boolean;
};

export type UpdateEventOptions = {
  conferenceDataVersion?: number;
  maxAttendees?: number;
  sendNotifications?: boolean;
  sendUpdates?: "all" | "externalOnly" | "none";
  supportsAttachments?: boolean;
};

export type DeleteEventOptions = {
  sendNotifications?: boolean;
  sendUpdates?: "all" | "externalOnly" | "none";
};

// 内部ユーティリティ関数
// Helper functions for mapping calendar list entries
const mapBasicCalendarInfo = (item: calendar_v3.Schema$CalendarListEntry) => {
  // idとsummaryは必須フィールドなので、ない場合はエラーを投げる
  if (!item.id || !item.summary) {
    throw new Error(
      `Invalid calendar entry: missing required fields (id: ${item.id}, summary: ${item.summary})`,
    );
  }
  return {
    id: item.id,
    summary: item.summary,
    description: item.description || undefined,
    location: item.location || undefined,
    timeZone: item.timeZone || undefined,
  };
};

const mapCalendarColors = (item: calendar_v3.Schema$CalendarListEntry) => ({
  colorId: item.colorId || undefined,
  backgroundColor: item.backgroundColor || undefined,
  foregroundColor: item.foregroundColor || undefined,
});

const mapCalendarSettings = (item: calendar_v3.Schema$CalendarListEntry) => ({
  selected: item.selected || undefined,
  accessRole: item.accessRole || undefined,
  primary: item.primary || undefined,
  deleted: item.deleted || undefined,
  hidden: item.hidden || undefined,
});

const mapDefaultReminders = (item: calendar_v3.Schema$CalendarListEntry) => {
  if (!item.defaultReminders) return undefined;

  const validReminders = item.defaultReminders.filter(
    (reminder) => reminder.method && typeof reminder.minutes === "number",
  );

  return validReminders.length > 0
    ? validReminders.map((reminder) => ({
        method: reminder.method!,
        minutes: reminder.minutes!,
      }))
    : undefined;
};

const mapNotificationSettings = (
  item: calendar_v3.Schema$CalendarListEntry,
) => {
  if (!item.notificationSettings) return undefined;

  const notifications =
    item.notificationSettings.notifications
      ?.filter((notif) => notif.type && notif.method)
      .map((notif) => ({
        type: notif.type!,
        method: notif.method!,
      })) || [];

  return notifications.length > 0 ? { notifications } : undefined;
};

const mapCalendarListEntry = (
  item: calendar_v3.Schema$CalendarListEntry,
): CalendarListEntry => {
  return {
    ...mapBasicCalendarInfo(item),
    ...mapCalendarColors(item),
    ...mapCalendarSettings(item),
    defaultReminders: mapDefaultReminders(item),
    notificationSettings: mapNotificationSettings(item),
  };
};

const mapCalendarEntry = (
  item: calendar_v3.Schema$Calendar,
): CalendarListEntry => {
  return {
    id: item.id!,
    summary: item.summary!,
    description: item.description || undefined,
    location: item.location || undefined,
    timeZone: item.timeZone || undefined,
  };
};

// Helper functions for mapping calendar events
const mapEventBasicInfo = (item: calendar_v3.Schema$Event) => ({
  id: item.id || undefined,
  summary: item.summary || undefined,
  description: item.description || undefined,
  location: item.location || undefined,
});

const mapEventDateTime = (
  dateTime: calendar_v3.Schema$EventDateTime | undefined,
) => {
  if (!dateTime) return undefined;
  return {
    date: dateTime.date || undefined,
    dateTime: dateTime.dateTime || undefined,
    timeZone: dateTime.timeZone || undefined,
  };
};

const mapEventTimes = (item: calendar_v3.Schema$Event) => ({
  start: mapEventDateTime(item.start),
  end: mapEventDateTime(item.end),
  originalStartTime: mapEventDateTime(item.originalStartTime),
});

const mapEventAttendees = (item: calendar_v3.Schema$Event) => {
  if (!item.attendees) return undefined;

  const validAttendees = item.attendees.filter((attendee) => attendee.email);

  return validAttendees.length > 0
    ? validAttendees.map((attendee) => ({
        email: attendee.email!,
        displayName: attendee.displayName || undefined,
        responseStatus:
          (attendee.responseStatus as
            | "needsAction"
            | "declined"
            | "tentative"
            | "accepted") || undefined,
        comment: attendee.comment || undefined,
        additionalGuests: attendee.additionalGuests || undefined,
        resource: attendee.resource || undefined,
      }))
    : undefined;
};

const mapEventReminders = (item: calendar_v3.Schema$Event) => {
  if (!item.reminders) return undefined;

  const overrides = item.reminders.overrides
    ?.filter(
      (override) => override.method && typeof override.minutes === "number",
    )
    .map((override) => ({
      method: override.method!,
      minutes: override.minutes!,
    }));

  return {
    useDefault: item.reminders.useDefault || undefined,
    overrides: overrides && overrides.length > 0 ? overrides : undefined,
  };
};

const mapEventPeople = (item: calendar_v3.Schema$Event) => ({
  organizer: item.organizer?.email
    ? {
        email: item.organizer.email,
        displayName: item.organizer.displayName || undefined,
        self: item.organizer.self || undefined,
      }
    : undefined,
  creator: item.creator?.email
    ? {
        email: item.creator.email,
        displayName: item.creator.displayName || undefined,
        self: item.creator.self || undefined,
      }
    : undefined,
});

const mapEventMetadata = (item: calendar_v3.Schema$Event) => ({
  created: item.created || undefined,
  updated: item.updated || undefined,
  htmlLink: item.htmlLink || undefined,
  etag: item.etag || undefined,
  recurringEventId: item.recurringEventId || undefined,
  privateCopy: item.privateCopy || undefined,
  locked: item.locked || undefined,
});

const mapEventProperties = (item: calendar_v3.Schema$Event) => ({
  recurrence: item.recurrence || undefined,
  visibility: (item.visibility as CalendarEvent["visibility"]) || undefined,
  status: (item.status as CalendarEvent["status"]) || undefined,
  transparency:
    (item.transparency as CalendarEvent["transparency"]) || undefined,
  colorId: item.colorId || undefined,
});

const mapEventSource = (item: calendar_v3.Schema$Event) => {
  return item.source?.url && item.source?.title
    ? {
        url: item.source.url,
        title: item.source.title,
      }
    : undefined;
};

const mapEventAttachments = (item: calendar_v3.Schema$Event) => {
  if (!item.attachments) return undefined;

  const validAttachments = item.attachments.filter(
    (attachment) => attachment.fileUrl,
  );

  return validAttachments.length > 0
    ? validAttachments.map((attachment) => ({
        fileUrl: attachment.fileUrl!,
        title: attachment.title || undefined,
        mimeType: attachment.mimeType || undefined,
        iconLink: attachment.iconLink || undefined,
        fileId: attachment.fileId || undefined,
      }))
    : undefined;
};

const mapConferenceData = (item: calendar_v3.Schema$Event) => {
  if (!item.conferenceData) return undefined;

  const createRequest =
    item.conferenceData.createRequest?.requestId &&
    item.conferenceData.createRequest?.conferenceSolutionKey?.type
      ? {
          requestId: item.conferenceData.createRequest.requestId,
          conferenceSolutionKey: {
            type: item.conferenceData.createRequest.conferenceSolutionKey.type,
          },
          status: item.conferenceData.createRequest.status?.statusCode
            ? {
                statusCode: item.conferenceData.createRequest.status.statusCode,
              }
            : undefined,
        }
      : undefined;

  const entryPoints = item.conferenceData.entryPoints
    ?.filter((ep) => ep.entryPointType)
    .map((ep) => ({
      entryPointType: ep.entryPointType!,
      uri: ep.uri || undefined,
      label: ep.label || undefined,
      pin: ep.pin || undefined,
      accessCode: ep.accessCode || undefined,
      meetingCode: ep.meetingCode || undefined,
      passcode: ep.passcode || undefined,
      password: ep.password || undefined,
    }));

  const conferenceSolution = item.conferenceData.conferenceSolution?.key?.type
    ? {
        key: {
          type: item.conferenceData.conferenceSolution.key.type,
        },
        name: item.conferenceData.conferenceSolution.name || undefined,
        iconUri: item.conferenceData.conferenceSolution.iconUri || undefined,
      }
    : undefined;

  return {
    createRequest,
    entryPoints:
      entryPoints && entryPoints.length > 0 ? entryPoints : undefined,
    conferenceSolution,
    conferenceId: item.conferenceData.conferenceId || undefined,
    signature: item.conferenceData.signature || undefined,
    notes: item.conferenceData.notes || undefined,
  };
};

const mapCalendarEvent = (item: calendar_v3.Schema$Event): CalendarEvent => {
  return {
    ...mapEventBasicInfo(item),
    ...mapEventTimes(item),
    ...mapEventProperties(item),
    ...mapEventPeople(item),
    ...mapEventMetadata(item),
    attendees: mapEventAttendees(item),
    reminders: mapEventReminders(item),
    source: mapEventSource(item),
    attachments: mapEventAttachments(item),
    conferenceData: mapConferenceData(item),
  };
};

const handleApiError = (
  error: unknown,
  context?: { calendarId?: string; eventId?: string },
): CalendarError => {
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code as number;
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "Unknown API error";

    switch (code) {
      case 400:
        return new ValidationError(message);
      case 403:
        return new PermissionDeniedError(message);
      case 404:
        // contextに応じて適切なエラーメッセージを返す
        if (context?.eventId) {
          return new EventNotFoundError(context.eventId, context.calendarId);
        }
        if (context?.calendarId) {
          return new CalendarNotFoundError(context.calendarId);
        }
        return new CalendarNotFoundError("Resource not found");
      case 429:
        return new QuotaExceededError(message);
      default:
        return new ApiError(message, code);
    }
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return new CalendarError(message);
};

// Calendar API関数群
export const createCalendarApi = (config: CalendarApiConfig) => {
  const calendar = google.calendar({ version: "v3", auth: config.auth });

  const listCalendars = async (
    options: ListCalendarsOptions = {},
  ): Promise<
    Result<
      { calendars: CalendarListEntry[]; nextPageToken?: string },
      CalendarError
    >
  > => {
    try {
      const response = await calendar.calendarList.list({
        maxResults: options.maxResults || 250,
        pageToken: options.pageToken,
        showDeleted: options.showDeleted,
        showHidden: options.showHidden,
        syncToken: options.syncToken,
      });

      const calendars =
        response.data.items?.map((item) => mapCalendarListEntry(item)) || [];

      return ok({
        calendars,
        nextPageToken: response.data.nextPageToken || undefined,
      });
    } catch (error) {
      return err(handleApiError(error));
    }
  };

  const getCalendar = async (
    calendarId: string,
  ): Promise<Result<CalendarListEntry, CalendarError>> => {
    try {
      const response = await calendar.calendars.get({
        calendarId,
      });

      return ok(mapCalendarEntry(response.data));
    } catch (error) {
      return err(handleApiError(error, { calendarId }));
    }
  };

  const listEvents = async (
    calendarId: string,
    options: ListEventsOptions = {},
  ): Promise<
    Result<{ events: CalendarEvent[]; nextPageToken?: string }, CalendarError>
  > => {
    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        maxResults: options.maxResults || 250,
        pageToken: options.pageToken,
        q: options.q,
        singleEvents: options.singleEvents ?? true,
        orderBy: options.orderBy,
        showDeleted: options.showDeleted,
        syncToken: options.syncToken,
      });

      const events =
        response.data.items?.map((item) => mapCalendarEvent(item)) || [];

      return ok({
        events,
        nextPageToken: response.data.nextPageToken || undefined,
      });
    } catch (error) {
      return err(handleApiError(error, { calendarId }));
    }
  };

  const getEvent = async (
    calendarId: string,
    eventId: string,
  ): Promise<Result<CalendarEvent, CalendarError>> => {
    try {
      const response = await calendar.events.get({
        calendarId,
        eventId,
      });

      return ok(mapCalendarEvent(response.data));
    } catch (error) {
      return err(handleApiError(error, { calendarId, eventId }));
    }
  };

  const createEvent = async (
    calendarId: string,
    event: CalendarEvent,
    options: CreateEventOptions = {},
  ): Promise<Result<CalendarEvent, CalendarError>> => {
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: options.conferenceDataVersion,
        maxAttendees: options.maxAttendees,
        sendNotifications: options.sendNotifications,
        sendUpdates: options.sendUpdates,
        supportsAttachments: options.supportsAttachments,
      });

      return ok(mapCalendarEvent(response.data));
    } catch (error) {
      return err(handleApiError(error, { calendarId }));
    }
  };

  const updateEvent = async (
    calendarId: string,
    eventId: string,
    event: CalendarEvent,
    options: UpdateEventOptions = {},
  ): Promise<Result<CalendarEvent, CalendarError>> => {
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
        conferenceDataVersion: options.conferenceDataVersion,
        maxAttendees: options.maxAttendees,
        sendNotifications: options.sendNotifications,
        sendUpdates: options.sendUpdates,
        supportsAttachments: options.supportsAttachments,
      });

      return ok(mapCalendarEvent(response.data));
    } catch (error) {
      return err(handleApiError(error, { calendarId, eventId }));
    }
  };

  const deleteEvent = async (
    calendarId: string,
    eventId: string,
    options: DeleteEventOptions = {},
  ): Promise<Result<void, CalendarError>> => {
    try {
      await calendar.events.delete({
        calendarId,
        eventId,
        sendNotifications: options.sendNotifications,
        sendUpdates: options.sendUpdates,
      });

      return ok(undefined);
    } catch (error) {
      return err(handleApiError(error, { calendarId, eventId }));
    }
  };

  const getFreeBusy = async (
    request: FreeBusyRequest,
  ): Promise<Result<FreeBusyResponse, CalendarError>> => {
    try {
      const response = await calendar.freebusy.query({
        requestBody: request,
      });

      return ok(response.data as FreeBusyResponse);
    } catch (error) {
      return err(handleApiError(error));
    }
  };

  const getColors = async (): Promise<
    Result<CalendarColors, CalendarError>
  > => {
    try {
      const response = await calendar.colors.get();

      return ok(response.data as CalendarColors);
    } catch (error) {
      return err(handleApiError(error));
    }
  };

  return {
    listCalendars,
    getCalendar,
    listEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    getFreeBusy,
    getColors,
  };
};
