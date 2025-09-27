import { z } from "zod";

export const TOOL_NAMES = {
  LIST_CALENDARS: "list_calendars",
  GET_CALENDAR: "get_calendar",
  LIST_EVENTS: "list_events",
  GET_EVENT: "get_event",
  CREATE_EVENT: "create_event",
  UPDATE_EVENT: "update_event",
  DELETE_EVENT: "delete_event",
  SEARCH_EVENTS: "search_events",
  GET_FREEBUSY: "get_freebusy",
  GET_COLORS: "get_colors",
} as const;

// Calendar Schemas
export const ListCalendarsSchema = z.object({
  maxResults: z
    .number()
    .min(1)
    .max(250)
    .optional()
    .describe("Maximum number of entries returned on one result page"),
  pageToken: z
    .string()
    .optional()
    .describe("Token specifying which result page to return"),
  showDeleted: z
    .boolean()
    .optional()
    .describe("Whether to include deleted calendar list entries"),
  showHidden: z.boolean().optional().describe("Whether to show hidden entries"),
});

export const GetCalendarSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
});

// Event Schemas
export const ListEventsSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
  timeMin: z
    .string()
    .optional()
    .describe(
      "Lower bound (exclusive) for an event's end time to filter by (RFC3339 timestamp)",
    ),
  timeMax: z
    .string()
    .optional()
    .describe(
      "Upper bound (exclusive) for an event's start time to filter by (RFC3339 timestamp)",
    ),
  maxResults: z
    .number()
    .min(1)
    .max(2500)
    .optional()
    .describe("Maximum number of events returned on one result page"),
  pageToken: z
    .string()
    .optional()
    .describe("Token specifying which result page to return"),
  q: z
    .string()
    .optional()
    .describe("Free text search terms to find events that match these terms"),
  singleEvents: z
    .boolean()
    .optional()
    .describe("Whether to expand recurring events into instances"),
  orderBy: z
    .enum(["startTime", "updated"])
    .optional()
    .describe("The order of the events returned in the result"),
  showDeleted: z
    .boolean()
    .optional()
    .describe("Whether to include deleted events"),
});

export const GetEventSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
  eventId: z.string().describe("Event identifier"),
});

export const EventDateTimeSchema = z.object({
  date: z
    .string()
    .optional()
    .describe(
      "The date, in the format YYYY-MM-DD, if this is an all-day event",
    ),
  dateTime: z
    .string()
    .optional()
    .describe(
      "The time, as a combined date-time value (formatted according to RFC3339)",
    ),
  timeZone: z
    .string()
    .optional()
    .describe("The time zone in which the time is specified"),
});

export const AttendeeSchema = z.object({
  email: z.string().email().describe("The attendee's email address"),
  displayName: z
    .string()
    .optional()
    .describe("The attendee's name, if available"),
  responseStatus: z
    .enum(["needsAction", "declined", "tentative", "accepted"])
    .optional()
    .describe("The attendee's response status"),
  comment: z.string().optional().describe("The attendee's response comment"),
  additionalGuests: z
    .number()
    .optional()
    .describe("Number of additional guests"),
  resource: z
    .boolean()
    .optional()
    .describe("Whether this entry represents a resource"),
});

export const ReminderSchema = z.object({
  method: z
    .enum(["email", "popup"])
    .describe("The method used by this reminder"),
  minutes: z
    .number()
    .min(0)
    .describe(
      "Number of minutes before the start of the event when the reminder should trigger",
    ),
});

export const CreateEventSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
  summary: z.string().describe("Title of the event"),
  description: z.string().optional().describe("Description of the event"),
  location: z.string().optional().describe("Geographic location of the event"),
  start: EventDateTimeSchema.describe(
    "The (inclusive) start time of the event",
  ),
  end: EventDateTimeSchema.describe("The (exclusive) end time of the event"),
  attendees: z.array(AttendeeSchema).optional().describe("List of attendees"),
  reminders: z
    .object({
      useDefault: z
        .boolean()
        .optional()
        .describe(
          "Whether the default reminders of the calendar apply to the event",
        ),
      overrides: z
        .array(ReminderSchema)
        .optional()
        .describe("If provided, replace the default reminders with these"),
    })
    .optional()
    .describe("Information about the event's reminders"),
  visibility: z
    .enum(["default", "public", "private", "confidential"])
    .optional()
    .describe("Visibility of the event"),
  transparency: z
    .enum(["opaque", "transparent"])
    .optional()
    .describe("Whether the event blocks time on the calendar"),
  colorId: z.string().optional().describe("The color of the event"),
  sendNotifications: z
    .boolean()
    .optional()
    .describe("Deprecated. Use sendUpdates instead"),
  sendUpdates: z
    .enum(["all", "externalOnly", "none"])
    .optional()
    .describe(
      "Whether to send notifications about the creation of the new event",
    ),
});

export const UpdateEventSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
  eventId: z.string().describe("Event identifier"),
  summary: z.string().optional().describe("Title of the event"),
  description: z.string().optional().describe("Description of the event"),
  location: z.string().optional().describe("Geographic location of the event"),
  start: EventDateTimeSchema.optional().describe(
    "The (inclusive) start time of the event",
  ),
  end: EventDateTimeSchema.optional().describe(
    "The (exclusive) end time of the event",
  ),
  attendees: z.array(AttendeeSchema).optional().describe("List of attendees"),
  reminders: z
    .object({
      useDefault: z
        .boolean()
        .optional()
        .describe(
          "Whether the default reminders of the calendar apply to the event",
        ),
      overrides: z
        .array(ReminderSchema)
        .optional()
        .describe("If provided, replace the default reminders with these"),
    })
    .optional()
    .describe("Information about the event's reminders"),
  visibility: z
    .enum(["default", "public", "private", "confidential"])
    .optional()
    .describe("Visibility of the event"),
  transparency: z
    .enum(["opaque", "transparent"])
    .optional()
    .describe("Whether the event blocks time on the calendar"),
  colorId: z.string().optional().describe("The color of the event"),
  sendNotifications: z
    .boolean()
    .optional()
    .describe("Deprecated. Use sendUpdates instead"),
  sendUpdates: z
    .enum(["all", "externalOnly", "none"])
    .optional()
    .describe("Whether to send notifications about the event update"),
});

export const DeleteEventSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
  eventId: z.string().describe("Event identifier"),
  sendNotifications: z
    .boolean()
    .optional()
    .describe("Deprecated. Use sendUpdates instead"),
  sendUpdates: z
    .enum(["all", "externalOnly", "none"])
    .optional()
    .describe("Whether to send notifications about the deletion of the event"),
});

export const SearchEventsSchema = z.object({
  calendarId: z.string().describe("Calendar identifier"),
  q: z
    .string()
    .describe("Free text search terms to find events that match these terms"),
  timeMin: z
    .string()
    .optional()
    .describe(
      "Lower bound (exclusive) for an event's end time to filter by (RFC3339 timestamp)",
    ),
  timeMax: z
    .string()
    .optional()
    .describe(
      "Upper bound (exclusive) for an event's start time to filter by (RFC3339 timestamp)",
    ),
  maxResults: z
    .number()
    .min(1)
    .max(2500)
    .optional()
    .describe("Maximum number of events returned"),
});

// FreeBusy Schema
export const GetFreeBusySchema = z.object({
  timeMin: z
    .string()
    .describe(
      "The start of the interval for the query formatted as per RFC3339",
    ),
  timeMax: z
    .string()
    .describe("The end of the interval for the query formatted as per RFC3339"),
  timeZone: z.string().optional().describe("Time zone used in the response"),
  calendarIds: z
    .array(z.string())
    .describe("List of calendars to query for free/busy information"),
});

// Colors Schema
export const GetColorsSchema = z.object({});

export type ListCalendarsInput = z.infer<typeof ListCalendarsSchema>;
export type GetCalendarInput = z.infer<typeof GetCalendarSchema>;
export type ListEventsInput = z.infer<typeof ListEventsSchema>;
export type GetEventInput = z.infer<typeof GetEventSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type DeleteEventInput = z.infer<typeof DeleteEventSchema>;
export type SearchEventsInput = z.infer<typeof SearchEventsSchema>;
export type GetFreeBusyInput = z.infer<typeof GetFreeBusySchema>;
export type GetColorsInput = z.infer<typeof GetColorsSchema>;
