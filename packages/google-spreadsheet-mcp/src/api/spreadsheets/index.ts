import type { sheets_v4 } from "googleapis";
import { google } from "googleapis";

import type { Result } from "../../lib/result/index.js";
import type { GoogleAuth } from "../auth/index.js";
// Import missing types
import type {
  BatchUpdateRequest,
  BatchUpdateResponse,
  CellValue,
  CreateSpreadsheetResponse,
  Range,
  RangeData,
  Sheet,
  SheetId,
  Spreadsheet,
  SpreadsheetId,
  UpdateResponse,
} from "../types.js";
import {
  GoogleSheetsApiError,
  ValidationError,
} from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result/index.js";

export class SpreadsheetsApi {
  private sheets: sheets_v4.Sheets;

  constructor(auth: GoogleAuth) {
    this.sheets = google.sheets({ version: "v4", auth: auth as any });
  }

  async getSpreadsheet(
    spreadsheetId: SpreadsheetId,
  ): Promise<Result<Spreadsheet, GoogleSheetsApiError>> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
      });

      const data = response.data;
      if (!data.spreadsheetId || !data.properties?.title || !data.sheets) {
        return err(new GoogleSheetsApiError("Invalid spreadsheet response"));
      }

      const spreadsheet: Spreadsheet = {
        spreadsheetId: data.spreadsheetId as SpreadsheetId,
        title: data.properties.title,
        locale: data.properties.locale ?? undefined,
        timeZone: data.properties.timeZone ?? undefined,
        sheets: data.sheets.map(
          (sheet): Sheet => ({
            sheetId: sheet.properties?.sheetId! as SheetId,
            title: sheet.properties?.title || "",
            index: sheet.properties?.index || 0,
            rowCount: sheet.properties?.gridProperties?.rowCount || 0,
            columnCount: sheet.properties?.gridProperties?.columnCount || 0,
            frozen: {
              rows:
                sheet.properties?.gridProperties?.frozenRowCount ?? undefined,
              columns:
                sheet.properties?.gridProperties?.frozenColumnCount ??
                undefined,
            },
          }),
        ),
        url:
          data.spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      };

      return ok(spreadsheet);
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to get spreadsheet: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async createSpreadsheet(
    title: string,
    sheetTitles?: string[],
  ): Promise<Result<CreateSpreadsheetResponse, GoogleSheetsApiError>> {
    try {
      const requestBody: sheets_v4.Schema$Spreadsheet = {
        properties: {
          title,
        },
      };

      if (sheetTitles && sheetTitles.length > 0) {
        requestBody.sheets = sheetTitles.map((sheetTitle, index) => ({
          properties: {
            title: sheetTitle,
            index,
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
            },
          },
        }));
      }

      const response = await this.sheets.spreadsheets.create({
        requestBody,
      });

      if (!response.data.spreadsheetId || !response.data.spreadsheetUrl) {
        return err(new GoogleSheetsApiError("Failed to create spreadsheet"));
      }

      return ok({
        spreadsheetId: response.data.spreadsheetId as SpreadsheetId,
        spreadsheetUrl: response.data.spreadsheetUrl,
      });
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to create spreadsheet: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async getValues(
    spreadsheetId: SpreadsheetId,
    range: Range,
  ): Promise<Result<CellValue[][], GoogleSheetsApiError>> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "UNFORMATTED_VALUE",
      });

      const values = response.data.values || [];
      return ok(values as CellValue[][]);
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to get values: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async updateValues(
    spreadsheetId: SpreadsheetId,
    range: Range,
    values: CellValue[][],
  ): Promise<Result<UpdateResponse, GoogleSheetsApiError>> {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });

      if (!response.data.updatedCells || !response.data.updatedRange) {
        return err(new GoogleSheetsApiError("No cells were updated"));
      }

      return ok({
        updatedCells: response.data.updatedCells || 0,
        updatedRows: response.data.updatedRows || 0,
        updatedColumns: response.data.updatedColumns || 0,
        updatedRange: response.data.updatedRange as Range,
      });
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to update values: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async batchUpdate(
    request: BatchUpdateRequest,
  ): Promise<Result<BatchUpdateResponse, GoogleSheetsApiError>> {
    try {
      const data = request.ranges.map((item) => ({
        range: item.range,
        values: item.values,
      }));

      const response = await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: request.spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data,
        },
      });

      if (!response.data.responses) {
        return err(new GoogleSheetsApiError("No batch update response"));
      }

      const responses = response.data.responses.map(
        (res): UpdateResponse => ({
          updatedCells: res.updatedCells || 0,
          updatedRows: res.updatedRows || 0,
          updatedColumns: res.updatedColumns || 0,
          updatedRange: res.updatedRange as Range,
        }),
      );

      return ok({
        totalUpdatedCells: response.data.totalUpdatedCells || 0,
        responses,
      });
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to batch update: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async appendRows(
    spreadsheetId: SpreadsheetId,
    range: Range,
    values: CellValue[][],
  ): Promise<Result<UpdateResponse, GoogleSheetsApiError>> {
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values,
        },
      });

      if (!response.data.updates) {
        return err(new GoogleSheetsApiError("No rows were appended"));
      }

      return ok({
        updatedCells: response.data.updates.updatedCells || 0,
        updatedRows: response.data.updates.updatedRows || 0,
        updatedColumns: response.data.updates.updatedColumns || 0,
        updatedRange: response.data.updates.updatedRange as Range,
      });
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to append rows: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async clearValues(
    spreadsheetId: SpreadsheetId,
    range: Range,
  ): Promise<Result<{ clearedRange: Range }, GoogleSheetsApiError>> {
    try {
      const response = await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });

      return ok({
        clearedRange: (response.data.clearedRange || range) as Range,
      });
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to clear values: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async addSheet(
    spreadsheetId: SpreadsheetId,
    title: string,
    rowCount = 1000,
    columnCount = 26,
  ): Promise<Result<Sheet, GoogleSheetsApiError>> {
    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title,
                  gridProperties: {
                    rowCount,
                    columnCount,
                  },
                },
              },
            },
          ],
        },
      });

      const addedSheet = response.data.replies?.[0]?.addSheet?.properties;
      if (!addedSheet) {
        return err(new GoogleSheetsApiError("Failed to add sheet"));
      }

      const sheet: Sheet = {
        sheetId: addedSheet.sheetId! as SheetId,
        title: addedSheet.title || title,
        index: addedSheet.index || 0,
        rowCount: addedSheet.gridProperties?.rowCount || rowCount,
        columnCount: addedSheet.gridProperties?.columnCount || columnCount,
      };

      return ok(sheet);
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to add sheet: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }

  async deleteSheet(
    spreadsheetId: SpreadsheetId,
    sheetId: SheetId,
  ): Promise<Result<void, GoogleSheetsApiError>> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId,
              },
            },
          ],
        },
      });

      return ok(undefined);
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to delete sheet: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }
}
