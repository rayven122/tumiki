import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";

import type { Result } from "../../lib/result/index.js";
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
import { err, ok } from "../../lib/result/index.js";

export class CalendarApi {
  private calendar: calendar_v3.Calendar;

  constructor(private auth: GoogleAuth) {
    this.calendar = google.calendar({ version: "v3", auth });
  }

  async listCalendars(
    options: {
      maxResults?: number;
      pageToken?: string;
      showDeleted?: boolean;
      showHidden?: boolean;
      syncToken?: string;
    } = {},
  ): Promise<
    Result<
      { calendars: CalendarListEntry[]; nextPageToken?: string },
      CalendarError
    >
  > {
    try {
      const response = await this.calendar.calendarList.list({
        maxResults: options.maxResults || 250,
        pageToken: options.pageToken,
        showDeleted: options.showDeleted,
        showHidden: options.showHidden,
        syncToken: options.syncToken,
      });

      const calendars =
        response.data.items?.map((item) => this.mapCalendarListEntry(item)) ||
        [];

      return ok({
        calendars,
        nextPageToken: response.data.nextPageToken || undefined,
      });
    } catch (error) {
      return err(this.handleApiError(error));
    }
  }

  async getCalendar(
    calendarId: string,
  ): Promise<Result<CalendarListEntry, CalendarError>> {
    try {
      const response = await this.calendar.calendars.get({
        calendarId,
      });

      return ok(this.mapCalendarEntry(response.data));
    } catch (error) {
      return err(this.handleApiError(error, { calendarId }));
    }
  }

  async listEvents(
    calendarId: string,
    options: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      pageToken?: string;
      q?: string;
      singleEvents?: boolean;
      orderBy?: "startTime" | "updated";
      showDeleted?: boolean;
      syncToken?: string;
    } = {},
  ): Promise<
    Result<{ events: CalendarEvent[]; nextPageToken?: string }, CalendarError>
  > {
    try {
      const response = await this.calendar.events.list({
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
        response.data.items?.map((item) => this.mapCalendarEvent(item)) || [];

      return ok({
        events,
        nextPageToken: response.data.nextPageToken || undefined,
      });
    } catch (error) {
      return err(this.handleApiError(error, { calendarId }));
    }
  }

  async getEvent(
    calendarId: string,
    eventId: string,
  ): Promise<Result<CalendarEvent, CalendarError>> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      return ok(this.mapCalendarEvent(response.data));
    } catch (error) {
      return err(this.handleApiError(error, { calendarId, eventId }));
    }
  }

  async createEvent(
    calendarId: string,
    event: CalendarEvent,
    options: {
      conferenceDataVersion?: number;
      maxAttendees?: number;
      sendNotifications?: boolean;
      sendUpdates?: "all" | "externalOnly" | "none";
      supportsAttachments?: boolean;
    } = {},
  ): Promise<Result<CalendarEvent, CalendarError>> {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: options.conferenceDataVersion,
        maxAttendees: options.maxAttendees,
        sendNotifications: options.sendNotifications,
        sendUpdates: options.sendUpdates,
        supportsAttachments: options.supportsAttachments,
      });

      return ok(this.mapCalendarEvent(response.data));
    } catch (error) {
      return err(this.handleApiError(error, { calendarId }));
    }
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: CalendarEvent,
    options: {
      conferenceDataVersion?: number;
      maxAttendees?: number;
      sendNotifications?: boolean;
      sendUpdates?: "all" | "externalOnly" | "none";
      supportsAttachments?: boolean;
    } = {},
  ): Promise<Result<CalendarEvent, CalendarError>> {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
        conferenceDataVersion: options.conferenceDataVersion,
        maxAttendees: options.maxAttendees,
        sendNotifications: options.sendNotifications,
        sendUpdates: options.sendUpdates,
        supportsAttachments: options.supportsAttachments,
      });

      return ok(this.mapCalendarEvent(response.data));
    } catch (error) {
      return err(this.handleApiError(error, { calendarId, eventId }));
    }
  }

  async deleteEvent(
    calendarId: string,
    eventId: string,
    options: {
      sendNotifications?: boolean;
      sendUpdates?: "all" | "externalOnly" | "none";
    } = {},
  ): Promise<Result<void, CalendarError>> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendNotifications: options.sendNotifications,
        sendUpdates: options.sendUpdates,
      });

      return ok(undefined);
    } catch (error) {
      return err(this.handleApiError(error, { calendarId, eventId }));
    }
  }

  async getFreeBusy(
    request: FreeBusyRequest,
  ): Promise<Result<FreeBusyResponse, CalendarError>> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: request,
      });

      return ok(response.data as FreeBusyResponse);
    } catch (error) {
      return err(this.handleApiError(error));
    }
  }

  async getColors(): Promise<Result<CalendarColors, CalendarError>> {
    try {
      const response = await this.calendar.colors.get();

      return ok(response.data as CalendarColors);
    } catch (error) {
      return err(this.handleApiError(error));
    }
  }

  private mapCalendarListEntry(
    item: calendar_v3.Schema$CalendarListEntry,
  ): CalendarListEntry {
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
      colorId: item.colorId || undefined,
      backgroundColor: item.backgroundColor || undefined,
      foregroundColor: item.foregroundColor || undefined,
      selected: item.selected || undefined,
      accessRole: item.accessRole || undefined,
      defaultReminders:
        item.defaultReminders
          ?.filter(
            (reminder) =>
              reminder.method && typeof reminder.minutes === "number",
          )
          .map((reminder) => ({
            method: reminder.method!,
            minutes: reminder.minutes!,
          })) || undefined,
      notificationSettings: item.notificationSettings
        ? {
            notifications:
              item.notificationSettings.notifications
                ?.filter((notif) => notif.type && notif.method)
                .map((notif) => ({
                  type: notif.type!,
                  method: notif.method!,
                })) || [],
          }
        : undefined,
      primary: item.primary || undefined,
      deleted: item.deleted || undefined,
      hidden: item.hidden || undefined,
    };
  }

  private mapCalendarEntry(
    item: calendar_v3.Schema$Calendar,
  ): CalendarListEntry {
    return {
      id: item.id!,
      summary: item.summary!,
      description: item.description || undefined,
      location: item.location || undefined,
      timeZone: item.timeZone || undefined,
    };
  }

  private mapCalendarEvent(item: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: item.id || undefined,
      summary: item.summary || undefined,
      description: item.description || undefined,
      location: item.location || undefined,
      start: item.start
        ? {
            date: item.start.date || undefined,
            dateTime: item.start.dateTime || undefined,
            timeZone: item.start.timeZone || undefined,
          }
        : undefined,
      end: item.end
        ? {
            date: item.end.date || undefined,
            dateTime: item.end.dateTime || undefined,
            timeZone: item.end.timeZone || undefined,
          }
        : undefined,
      recurrence: item.recurrence || undefined,
      attendees:
        item.attendees
          ?.filter((attendee) => attendee.email)
          .map((attendee) => ({
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
          })) || undefined,
      reminders: item.reminders
        ? {
            useDefault: item.reminders.useDefault || undefined,
            overrides:
              item.reminders.overrides
                ?.filter(
                  (override) =>
                    override.method && typeof override.minutes === "number",
                )
                .map((override) => ({
                  method: override.method!,
                  minutes: override.minutes!,
                })) || undefined,
          }
        : undefined,
      visibility: (item.visibility as CalendarEvent["visibility"]) || undefined,
      status: (item.status as CalendarEvent["status"]) || undefined,
      transparency:
        (item.transparency as CalendarEvent["transparency"]) || undefined,
      colorId: item.colorId || undefined,
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
      created: item.created || undefined,
      updated: item.updated || undefined,
      htmlLink: item.htmlLink || undefined,
      etag: item.etag || undefined,
      recurringEventId: item.recurringEventId || undefined,
      originalStartTime: item.originalStartTime
        ? {
            date: item.originalStartTime.date || undefined,
            dateTime: item.originalStartTime.dateTime || undefined,
            timeZone: item.originalStartTime.timeZone || undefined,
          }
        : undefined,
      privateCopy: item.privateCopy || undefined,
      locked: item.locked || undefined,
      source:
        item.source?.url && item.source?.title
          ? {
              url: item.source.url,
              title: item.source.title,
            }
          : undefined,
      attachments:
        item.attachments
          ?.filter((attachment) => attachment.fileUrl)
          .map((attachment) => ({
            fileUrl: attachment.fileUrl!,
            title: attachment.title || undefined,
            mimeType: attachment.mimeType || undefined,
            iconLink: attachment.iconLink || undefined,
            fileId: attachment.fileId || undefined,
          })) || undefined,
      conferenceData: item.conferenceData
        ? {
            createRequest:
              item.conferenceData.createRequest?.requestId &&
              item.conferenceData.createRequest?.conferenceSolutionKey?.type
                ? {
                    requestId: item.conferenceData.createRequest.requestId,
                    conferenceSolutionKey: {
                      type: item.conferenceData.createRequest
                        .conferenceSolutionKey.type,
                    },
                    status: item.conferenceData.createRequest.status?.statusCode
                      ? {
                          statusCode:
                            item.conferenceData.createRequest.status.statusCode,
                        }
                      : undefined,
                  }
                : undefined,
            entryPoints:
              item.conferenceData.entryPoints
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
                })) || undefined,
            conferenceSolution: item.conferenceData.conferenceSolution?.key
              ?.type
              ? {
                  key: {
                    type: item.conferenceData.conferenceSolution.key.type,
                  },
                  name:
                    item.conferenceData.conferenceSolution.name || undefined,
                  iconUri:
                    item.conferenceData.conferenceSolution.iconUri || undefined,
                }
              : undefined,
            conferenceId: item.conferenceData.conferenceId || undefined,
            signature: item.conferenceData.signature || undefined,
            notes: item.conferenceData.notes || undefined,
          }
        : undefined,
    };
  }

  private handleApiError(
    error: unknown,
    context?: { calendarId?: string; eventId?: string },
  ): CalendarError {
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
  }
}
