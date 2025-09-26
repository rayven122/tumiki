import { TOOL_NAMES } from "./types.js";

export const SERVER_INFO = {
  name: "google-spreadsheet-mcp",
  version: "0.1.0",
  description:
    "Google Spreadsheet MCP Server - Read, write, and manage Google Sheets",
} as const;

export const TOOL_DESCRIPTIONS = {
  [TOOL_NAMES.LIST_SPREADSHEETS]: {
    name: TOOL_NAMES.LIST_SPREADSHEETS,
    description:
      "List all accessible spreadsheets, optionally filtered by query",
  },
  [TOOL_NAMES.GET_SPREADSHEET]: {
    name: TOOL_NAMES.GET_SPREADSHEET,
    description:
      "Get detailed information about a spreadsheet including all sheets",
  },
  [TOOL_NAMES.CREATE_SPREADSHEET]: {
    name: TOOL_NAMES.CREATE_SPREADSHEET,
    description: "Create a new spreadsheet with optional initial sheets",
  },
  [TOOL_NAMES.LIST_SHEETS]: {
    name: TOOL_NAMES.LIST_SHEETS,
    description: "List all sheets in a spreadsheet",
  },
  [TOOL_NAMES.CREATE_SHEET]: {
    name: TOOL_NAMES.CREATE_SHEET,
    description: "Add a new sheet to an existing spreadsheet",
  },
  [TOOL_NAMES.DELETE_SHEET]: {
    name: TOOL_NAMES.DELETE_SHEET,
    description: "Delete a sheet from a spreadsheet",
  },
  [TOOL_NAMES.GET_SHEET_DATA]: {
    name: TOOL_NAMES.GET_SHEET_DATA,
    description: "Read data from a specific range in a sheet",
  },
  [TOOL_NAMES.UPDATE_CELLS]: {
    name: TOOL_NAMES.UPDATE_CELLS,
    description: "Update cells in a specific range",
  },
  [TOOL_NAMES.BATCH_UPDATE_CELLS]: {
    name: TOOL_NAMES.BATCH_UPDATE_CELLS,
    description: "Update multiple ranges in a single request",
  },
  [TOOL_NAMES.APPEND_ROWS]: {
    name: TOOL_NAMES.APPEND_ROWS,
    description: "Append new rows to the end of a sheet",
  },
  [TOOL_NAMES.CLEAR_RANGE]: {
    name: TOOL_NAMES.CLEAR_RANGE,
    description: "Clear all values from a specific range",
  },
  [TOOL_NAMES.SHARE_SPREADSHEET]: {
    name: TOOL_NAMES.SHARE_SPREADSHEET,
    description:
      "Share a spreadsheet with specific users, groups, or make it public",
  },
  [TOOL_NAMES.GET_PERMISSIONS]: {
    name: TOOL_NAMES.GET_PERMISSIONS,
    description: "Get all permissions for a spreadsheet",
  },
  [TOOL_NAMES.REMOVE_PERMISSION]: {
    name: TOOL_NAMES.REMOVE_PERMISSION,
    description: "Remove a specific permission from a spreadsheet",
  },
} as const;
