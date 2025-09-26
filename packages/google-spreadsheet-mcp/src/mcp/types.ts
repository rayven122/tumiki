import { z } from "zod";

// Tool Names
export const TOOL_NAMES = {
  LIST_SPREADSHEETS: "list_spreadsheets",
  GET_SPREADSHEET: "get_spreadsheet",
  CREATE_SPREADSHEET: "create_spreadsheet",
  LIST_SHEETS: "list_sheets",
  CREATE_SHEET: "create_sheet",
  DELETE_SHEET: "delete_sheet",
  GET_SHEET_DATA: "get_sheet_data",
  UPDATE_CELLS: "update_cells",
  BATCH_UPDATE_CELLS: "batch_update_cells",
  APPEND_ROWS: "append_rows",
  CLEAR_RANGE: "clear_range",
  SHARE_SPREADSHEET: "share_spreadsheet",
  GET_PERMISSIONS: "get_permissions",
  REMOVE_PERMISSION: "remove_permission",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// Tool Input Schemas
export const ListSpreadsheetsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Optional search query to filter spreadsheets"),
});

export const GetSpreadsheetSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
});

export const CreateSpreadsheetSchema = z.object({
  title: z.string().describe("The title of the new spreadsheet"),
  sheetTitles: z
    .array(z.string())
    .optional()
    .describe("Optional array of sheet titles to create"),
});

export const ListSheetsSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
});

export const CreateSheetSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  title: z.string().describe("The title of the new sheet"),
  rowCount: z
    .number()
    .optional()
    .default(1000)
    .describe("Number of rows (default: 1000)"),
  columnCount: z
    .number()
    .optional()
    .default(26)
    .describe("Number of columns (default: 26)"),
});

export const DeleteSheetSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  sheetId: z.number().describe("The ID of the sheet to delete"),
});

export const GetSheetDataSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  range: z.string().describe('A1 notation range (e.g., "Sheet1!A1:B10")'),
});

export const UpdateCellsSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  range: z.string().describe('A1 notation range (e.g., "Sheet1!A1:B10")'),
  values: z
    .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
    .describe("2D array of values"),
});

export const BatchUpdateCellsSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  updates: z
    .array(
      z.object({
        range: z.string().describe("A1 notation range"),
        values: z
          .array(
            z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
          )
          .describe("2D array of values"),
      }),
    )
    .describe("Array of range-value pairs to update"),
});

export const AppendRowsSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  range: z.string().describe('A1 notation range (e.g., "Sheet1!A:A")'),
  values: z
    .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
    .describe("2D array of values to append"),
});

export const ClearRangeSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  range: z.string().describe("A1 notation range to clear"),
});

export const ShareSpreadsheetSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  email: z
    .string()
    .optional()
    .describe("Email address for user/group permissions"),
  domain: z.string().optional().describe("Domain for domain permissions"),
  type: z
    .enum(["user", "group", "domain", "anyone"])
    .describe("Type of permission"),
  role: z
    .enum(["owner", "writer", "reader", "commenter"])
    .describe("Role to grant"),
  sendNotificationEmail: z
    .boolean()
    .optional()
    .default(false)
    .describe("Send notification email"),
});

export const GetPermissionsSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
});

export const RemovePermissionSchema = z.object({
  spreadsheetId: z.string().describe("The ID of the spreadsheet"),
  permissionId: z.string().describe("The ID of the permission to remove"),
});

// Tool Types
export type ListSpreadsheetsInput = z.infer<typeof ListSpreadsheetsSchema>;
export type GetSpreadsheetInput = z.infer<typeof GetSpreadsheetSchema>;
export type CreateSpreadsheetInput = z.infer<typeof CreateSpreadsheetSchema>;
export type ListSheetsInput = z.infer<typeof ListSheetsSchema>;
export type CreateSheetInput = z.infer<typeof CreateSheetSchema>;
export type DeleteSheetInput = z.infer<typeof DeleteSheetSchema>;
export type GetSheetDataInput = z.infer<typeof GetSheetDataSchema>;
export type UpdateCellsInput = z.infer<typeof UpdateCellsSchema>;
export type BatchUpdateCellsInput = z.infer<typeof BatchUpdateCellsSchema>;
export type AppendRowsInput = z.infer<typeof AppendRowsSchema>;
export type ClearRangeInput = z.infer<typeof ClearRangeSchema>;
export type ShareSpreadsheetInput = z.infer<typeof ShareSpreadsheetSchema>;
export type GetPermissionsInput = z.infer<typeof GetPermissionsSchema>;
export type RemovePermissionInput = z.infer<typeof RemovePermissionSchema>;
