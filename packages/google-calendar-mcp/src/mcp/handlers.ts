import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

import type { createCalendarApi } from "../api/index.js";
import type { CalendarError } from "../lib/errors/index.js";
import type { Result } from "../lib/result/index.js";
import { ValidationError } from "../lib/errors/index.js";
import { err } from "../lib/result/index.js";
import { getCalendar, listCalendars } from "./tools/calendars.js";
import { getColors } from "./tools/colors.js";
import {
  createEvent,
  deleteEvent,
  getEvent,
  getFreeBusy,
  listEvents,
  searchEvents,
  updateEvent,
} from "./tools/events.js";
import {
  CreateEventSchema,
  DeleteEventSchema,
  GetCalendarSchema,
  GetColorsSchema,
  GetEventSchema,
  GetFreeBusySchema,
  ListCalendarsSchema,
  ListEventsSchema,
  SearchEventsSchema,
  TOOL_NAMES,
  UpdateEventSchema,
} from "./types.js";

export const handleToolCall = async (
  client: ReturnType<typeof createCalendarApi>,
  request: CallToolRequest,
): Promise<Result<unknown, CalendarError>> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case TOOL_NAMES.LIST_CALENDARS: {
        const parsed = ListCalendarsSchema.parse(args);
        return await listCalendars(client, parsed);
      }

      case TOOL_NAMES.GET_CALENDAR: {
        const parsed = GetCalendarSchema.parse(args);
        return await getCalendar(client, parsed);
      }

      case TOOL_NAMES.LIST_EVENTS: {
        const parsed = ListEventsSchema.parse(args);
        return await listEvents(client, parsed);
      }

      case TOOL_NAMES.GET_EVENT: {
        const parsed = GetEventSchema.parse(args);
        return await getEvent(client, parsed);
      }

      case TOOL_NAMES.CREATE_EVENT: {
        const parsed = CreateEventSchema.parse(args);
        return await createEvent(client, parsed);
      }

      case TOOL_NAMES.UPDATE_EVENT: {
        const parsed = UpdateEventSchema.parse(args);
        return await updateEvent(client, parsed);
      }

      case TOOL_NAMES.DELETE_EVENT: {
        const parsed = DeleteEventSchema.parse(args);
        return await deleteEvent(client, parsed);
      }

      case TOOL_NAMES.SEARCH_EVENTS: {
        const parsed = SearchEventsSchema.parse(args);
        return await searchEvents(client, parsed);
      }

      case TOOL_NAMES.GET_FREEBUSY: {
        const parsed = GetFreeBusySchema.parse(args);
        return await getFreeBusy(client, parsed);
      }

      case TOOL_NAMES.GET_COLORS: {
        const parsed = GetColorsSchema.parse(args);
        return await getColors(client, parsed);
      }

      default:
        return err(new ValidationError(`Unknown tool: ${name}`));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation error";
    return err(
      new ValidationError(`Invalid arguments for ${name}: ${message}`),
    );
  }
};
