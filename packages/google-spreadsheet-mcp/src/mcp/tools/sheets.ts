import type { GoogleSheetsClient } from "../../api/index.js";
import type {
  CellValue,
  Range,
  SheetId,
  SpreadsheetId,
} from "../../api/types.js";
import type { Result } from "../../lib/result/index.js";
import type {
  AppendRowsInput,
  BatchUpdateCellsInput,
  ClearRangeInput,
  CreateSheetInput,
  DeleteSheetInput,
  GetSheetDataInput,
  ListSheetsInput,
  UpdateCellsInput,
} from "../types.js";
import { err, ok } from "../../lib/result/index.js";

export const handleListSheets = async (
  client: GoogleSheetsClient,
  input: ListSheetsInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.getSpreadsheet(
      input.spreadsheetId as SpreadsheetId,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      sheets: result.value.sheets.map((sheet) => ({
        id: sheet.sheetId,
        title: sheet.title,
        index: sheet.index,
        rows: sheet.rowCount,
        columns: sheet.columnCount,
      })),
      count: result.value.sheets.length,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleCreateSheet = async (
  client: GoogleSheetsClient,
  input: CreateSheetInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.addSheet(
      input.spreadsheetId as SpreadsheetId,
      input.title,
      input.rowCount,
      input.columnCount,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      sheet: {
        id: result.value.sheetId,
        title: result.value.title,
        rows: result.value.rowCount,
        columns: result.value.columnCount,
      },
      message: `Successfully created sheet "${input.title}"`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleDeleteSheet = async (
  client: GoogleSheetsClient,
  input: DeleteSheetInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.deleteSheet(
      input.spreadsheetId as SpreadsheetId,
      input.sheetId as SheetId,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      message: `Successfully deleted sheet with ID ${input.sheetId}`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleGetSheetData = async (
  client: GoogleSheetsClient,
  input: GetSheetDataInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.getValues(
      input.spreadsheetId as SpreadsheetId,
      input.range as Range,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      range: input.range,
      values: result.value,
      rows: result.value.length,
      columns: result.value[0]?.length ?? 0,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleUpdateCells = async (
  client: GoogleSheetsClient,
  input: UpdateCellsInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.updateValues(
      input.spreadsheetId as SpreadsheetId,
      input.range as Range,
      input.values as CellValue[][],
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...result.value,
      message: `Successfully updated ${result.value.updatedCells} cells in range ${result.value.updatedRange}`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleBatchUpdateCells = async (
  client: GoogleSheetsClient,
  input: BatchUpdateCellsInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId as SpreadsheetId,
      ranges: input.updates.map((update) => ({
        range: update.range as Range,
        values: update.values as CellValue[][],
      })),
    });

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...result.value,
      message: `Successfully updated ${result.value.totalUpdatedCells} cells across ${result.value.responses.length} ranges`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleAppendRows = async (
  client: GoogleSheetsClient,
  input: AppendRowsInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.appendRows(
      input.spreadsheetId as SpreadsheetId,
      input.range as Range,
      input.values as CellValue[][],
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...result.value,
      message: `Successfully appended ${result.value.updatedRows} rows`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleClearRange = async (
  client: GoogleSheetsClient,
  input: ClearRangeInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.clearValues(
      input.spreadsheetId as SpreadsheetId,
      input.range as Range,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      clearedRange: result.value.clearedRange,
      message: `Successfully cleared range ${result.value.clearedRange}`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
