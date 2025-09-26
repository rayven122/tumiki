import type { GoogleSheetsClient } from "../../api/index.js";
import type { SpreadsheetId } from "../../api/types.js";
import type { Result } from "../../lib/result/index.js";
import type {
  CreateSpreadsheetInput,
  GetSpreadsheetInput,
  ListSpreadsheetsInput,
} from "../types.js";
import { err, ok } from "../../lib/result/index.js";

export const handleListSpreadsheets = async (
  client: GoogleSheetsClient,
  input: ListSpreadsheetsInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.drive.listSpreadsheets(input.query);

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      spreadsheets: result.value.map((file) => ({
        id: file.id,
        name: file.name,
        url: `https://docs.google.com/spreadsheets/d/${file.id}`,
      })),
      count: result.value.length,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleGetSpreadsheet = async (
  client: GoogleSheetsClient,
  input: GetSpreadsheetInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.getSpreadsheet(
      input.spreadsheetId as SpreadsheetId,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...result.value,
      sheetCount: result.value.sheets.length,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleCreateSpreadsheet = async (
  client: GoogleSheetsClient,
  input: CreateSpreadsheetInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.spreadsheets.createSpreadsheet(
      input.title,
      input.sheetTitles,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...result.value,
      message: `Successfully created spreadsheet "${input.title}"`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
