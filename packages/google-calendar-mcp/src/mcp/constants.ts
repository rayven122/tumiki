import { TOOL_NAMES } from "./types.js";

export const SERVER_INFO = {
  name: "google-calendar-mcp",
  version: "0.1.0",
  description:
    "Google Calendar MCP Server - Read, write, and manage Google Calendar events",
} as const;

export const TOOL_DESCRIPTIONS = {
  [TOOL_NAMES.LIST_CALENDARS]: {
    name: TOOL_NAMES.LIST_CALENDARS,
    description:
      "List all accessible calendars, optionally filtered by visibility settings",
  },
  [TOOL_NAMES.GET_CALENDAR]: {
    name: TOOL_NAMES.GET_CALENDAR,
    description: "Get detailed information about a specific calendar",
  },
  [TOOL_NAMES.LIST_EVENTS]: {
    name: TOOL_NAMES.LIST_EVENTS,
    description: "List events from a calendar within a specified time range",
  },
  [TOOL_NAMES.GET_EVENT]: {
    name: TOOL_NAMES.GET_EVENT,
    description: "Get detailed information about a specific event",
  },
  [TOOL_NAMES.CREATE_EVENT]: {
    name: TOOL_NAMES.CREATE_EVENT,
    description:
      "Create a new event in a calendar with title, time, attendees, and other details",
  },
  [TOOL_NAMES.UPDATE_EVENT]: {
    name: TOOL_NAMES.UPDATE_EVENT,
    description: "Update an existing event with new information",
  },
  [TOOL_NAMES.DELETE_EVENT]: {
    name: TOOL_NAMES.DELETE_EVENT,
    description: "Delete an event from a calendar",
  },
  [TOOL_NAMES.SEARCH_EVENTS]: {
    name: TOOL_NAMES.SEARCH_EVENTS,
    description: "Search for events in a calendar using free text queries",
  },
  [TOOL_NAMES.GET_FREEBUSY]: {
    name: TOOL_NAMES.GET_FREEBUSY,
    description:
      "Check availability across multiple calendars for scheduling purposes",
  },
  [TOOL_NAMES.GET_COLORS]: {
    name: TOOL_NAMES.GET_COLORS,
    description: "Get available colors for calendars and events",
  },
} as const;
