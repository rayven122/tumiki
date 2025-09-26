import type { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { GoogleSheetsClient } from "../api/index.js";
import type { Result } from "../lib/result/index.js";
import { err } from "../lib/result/index.js";
import {
  handleAppendRows,
  handleBatchUpdateCells,
  handleClearRange,
  handleCreateSheet,
  handleCreateSpreadsheet,
  handleDeleteSheet,
  handleGetPermissions,
  handleGetSheetData,
  handleGetSpreadsheet,
  handleListSheets,
  handleListSpreadsheets,
  handleRemovePermission,
  handleShareSpreadsheet,
  handleUpdateCells,
} from "./tools/index.js";
import {
  AppendRowsSchema,
  BatchUpdateCellsSchema,
  ClearRangeSchema,
  CreateSheetSchema,
  CreateSpreadsheetSchema,
  DeleteSheetSchema,
  GetPermissionsSchema,
  GetSheetDataSchema,
  GetSpreadsheetSchema,
  ListSheetsSchema,
  ListSpreadsheetsSchema,
  RemovePermissionSchema,
  ShareSpreadsheetSchema,
  TOOL_NAMES,
  UpdateCellsSchema,
} from "./types.js";

type CallToolRequest = z.infer<typeof CallToolRequestSchema>;

export const handleToolCall = async (
  client: GoogleSheetsClient,
  request: CallToolRequest,
): Promise<Result<unknown, Error>> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case TOOL_NAMES.LIST_SPREADSHEETS:
        return handleListSpreadsheets(
          client,
          ListSpreadsheetsSchema.parse(args),
        );

      case TOOL_NAMES.GET_SPREADSHEET:
        return handleGetSpreadsheet(client, GetSpreadsheetSchema.parse(args));

      case TOOL_NAMES.CREATE_SPREADSHEET:
        return handleCreateSpreadsheet(
          client,
          CreateSpreadsheetSchema.parse(args),
        );

      case TOOL_NAMES.LIST_SHEETS:
        return handleListSheets(client, ListSheetsSchema.parse(args));

      case TOOL_NAMES.CREATE_SHEET:
        return handleCreateSheet(client, CreateSheetSchema.parse(args));

      case TOOL_NAMES.DELETE_SHEET:
        return handleDeleteSheet(client, DeleteSheetSchema.parse(args));

      case TOOL_NAMES.GET_SHEET_DATA:
        return handleGetSheetData(client, GetSheetDataSchema.parse(args));

      case TOOL_NAMES.UPDATE_CELLS:
        return handleUpdateCells(client, UpdateCellsSchema.parse(args));

      case TOOL_NAMES.BATCH_UPDATE_CELLS:
        return handleBatchUpdateCells(
          client,
          BatchUpdateCellsSchema.parse(args),
        );

      case TOOL_NAMES.APPEND_ROWS:
        return handleAppendRows(client, AppendRowsSchema.parse(args));

      case TOOL_NAMES.CLEAR_RANGE:
        return handleClearRange(client, ClearRangeSchema.parse(args));

      case TOOL_NAMES.SHARE_SPREADSHEET:
        return handleShareSpreadsheet(
          client,
          ShareSpreadsheetSchema.parse(args),
        );

      case TOOL_NAMES.GET_PERMISSIONS:
        return handleGetPermissions(client, GetPermissionsSchema.parse(args));

      case TOOL_NAMES.REMOVE_PERMISSION:
        return handleRemovePermission(
          client,
          RemovePermissionSchema.parse(args),
        );

      default:
        return err(new Error(`Unknown tool: ${name}`));
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(new Error(`Invalid arguments: ${error.message}`));
    }
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
