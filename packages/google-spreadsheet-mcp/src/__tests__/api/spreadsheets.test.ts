import { google } from "googleapis";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { GoogleAuth } from "../../api/auth/index.js";
import type {
  BatchUpdateRequest,
  CellValue,
  Range,
  Sheet,
  SheetId,
  SpreadsheetId,
} from "../../api/types.js";
import type { MockSheetsApi } from "../types/mocks.js";
import { SpreadsheetsApi } from "../../api/spreadsheets/index.js";
import { GoogleSheetsApiError } from "../../lib/errors/index.js";

// Googleライブラリのモック
vi.mock("googleapis");

describe("SpreadsheetsApi", () => {
  let spreadsheetsApi: SpreadsheetsApi;
  let mockAuth: GoogleAuth;
  let mockSheets: MockSheetsApi;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {} as GoogleAuth;

    mockSheets = {
      spreadsheets: {
        get: vi.fn(),
        create: vi.fn(),
        batchUpdate: vi.fn(),
        values: {
          get: vi.fn(),
          update: vi.fn(),
          batchUpdate: vi.fn(),
          append: vi.fn(),
          clear: vi.fn(),
        },
      },
    } as unknown as MockSheetsApi;

    vi.mocked(google.sheets).mockReturnValue(mockSheets as any);
    spreadsheetsApi = new SpreadsheetsApi(mockAuth);
  });

  describe("constructor", () => {
    test("正常系: SpreadsheetsApiインスタンスを作成する", () => {
      expect(google.sheets).toHaveBeenCalledWith({
        version: "v4",
        auth: mockAuth,
      });
      expect(spreadsheetsApi).toBeInstanceOf(SpreadsheetsApi);
    });
  });

  describe("getSpreadsheet", () => {
    test("正常系: スプレッドシート情報を取得する", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "sheet-123",
          properties: {
            title: "Test Spreadsheet",
            locale: "ja_JP",
            timeZone: "Asia/Tokyo",
          },
          spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-123",
          sheets: [
            {
              properties: {
                sheetId: 0,
                title: "Sheet1",
                index: 0,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                  frozenRowCount: 1,
                  frozenColumnCount: 2,
                },
              },
            },
            {
              properties: {
                sheetId: 1,
                title: "Sheet2",
                index: 1,
                gridProperties: {
                  rowCount: 500,
                  columnCount: 10,
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getSpreadsheet(
        "sheet-123" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.spreadsheetId).toStrictEqual("sheet-123");
        expect(result.value.title).toStrictEqual("Test Spreadsheet");
        expect(result.value.locale).toStrictEqual("ja_JP");
        expect(result.value.timeZone).toStrictEqual("Asia/Tokyo");
        expect(result.value.url).toStrictEqual(
          "https://docs.google.com/spreadsheets/d/sheet-123",
        );
        expect(result.value.sheets).toHaveLength(2);
        expect(result.value.sheets[0]).toStrictEqual({
          sheetId: 0,
          title: "Sheet1",
          index: 0,
          rowCount: 1000,
          columnCount: 26,
          frozen: {
            rows: 1,
            columns: 2,
          },
        });
        expect(result.value.sheets[1]).toStrictEqual({
          sheetId: 1,
          title: "Sheet2",
          index: 1,
          rowCount: 500,
          columnCount: 10,
          frozen: {
            rows: undefined,
            columns: undefined,
          },
        });
      }

      expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        includeGridData: false,
      });
    });

    test("正常系: 最小限のデータでスプレッドシート情報を取得する", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "sheet-minimal",
          properties: {
            title: "Minimal Sheet",
          },
          sheets: [
            {
              properties: {
                sheetId: 0,
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getSpreadsheet(
        "sheet-minimal" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.spreadsheetId).toStrictEqual("sheet-minimal");
        expect(result.value.title).toStrictEqual("Minimal Sheet");
        expect(result.value.locale).toStrictEqual(undefined);
        expect(result.value.timeZone).toStrictEqual(undefined);
        expect(result.value.url).toStrictEqual(
          "https://docs.google.com/spreadsheets/d/sheet-minimal",
        );
        expect(result.value.sheets).toHaveLength(1);
        expect(result.value.sheets[0]).toStrictEqual({
          sheetId: 0,
          title: "",
          index: 0,
          rowCount: 0,
          columnCount: 0,
          frozen: {
            rows: undefined,
            columns: undefined,
          },
        });
      }
    });

    test("正常系: sheetIdが未定義のシートをフィルタする", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "sheet-123",
          properties: {
            title: "Test Sheet",
          },
          sheets: [
            {
              properties: {
                sheetId: 0,
                title: "Valid Sheet",
              },
            },
            {
              properties: {
                title: "Invalid Sheet",
                // sheetIdが未定義
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getSpreadsheet(
        "sheet-123" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.sheets).toHaveLength(1);
        expect(result.value.sheets[0].title).toStrictEqual("Valid Sheet");
      }
    });

    test("異常系: spreadsheetIdが不足している", async () => {
      const mockResponse = {
        data: {
          properties: {
            title: "Test Sheet",
          },
          sheets: [],
        },
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getSpreadsheet(
        "invalid" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Invalid spreadsheet response",
        );
      }
    });

    test("異常系: タイトルが不足している", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "sheet-123",
          properties: {},
          sheets: [],
        },
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getSpreadsheet(
        "sheet-123" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Invalid spreadsheet response",
        );
      }
    });

    test("異常系: sheetsが不足している", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "sheet-123",
          properties: {
            title: "Test Sheet",
          },
        },
      };

      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getSpreadsheet(
        "sheet-123" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Invalid spreadsheet response",
        );
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Spreadsheet not found");
      (error as any).response = {
        status: 404,
        data: { error: "Not Found" },
      };
      mockSheets.spreadsheets.get.mockRejectedValue(error);

      const result = await spreadsheetsApi.getSpreadsheet(
        "not-found" as SpreadsheetId,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to get spreadsheet");
        expect(result.error.message).toContain("Spreadsheet not found");
        expect(result.error.statusCode).toStrictEqual(404);
        expect(result.error.details).toStrictEqual({ error: "Not Found" });
      }
    });
  });

  describe("createSpreadsheet", () => {
    test("正常系: タイトルのみでスプレッドシートを作成する", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "new-sheet-123",
          spreadsheetUrl:
            "https://docs.google.com/spreadsheets/d/new-sheet-123",
        },
      };

      mockSheets.spreadsheets.create.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.createSpreadsheet("New Spreadsheet");

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.spreadsheetId).toStrictEqual("new-sheet-123");
        expect(result.value.spreadsheetUrl).toStrictEqual(
          "https://docs.google.com/spreadsheets/d/new-sheet-123",
        );
      }

      expect(mockSheets.spreadsheets.create).toHaveBeenCalledWith({
        requestBody: {
          properties: {
            title: "New Spreadsheet",
          },
        },
      });
    });

    test("正常系: シートタイトルを指定してスプレッドシートを作成する", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "new-sheet-456",
          spreadsheetUrl:
            "https://docs.google.com/spreadsheets/d/new-sheet-456",
        },
      };

      mockSheets.spreadsheets.create.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.createSpreadsheet("Multi Sheet", [
        "Data",
        "Analysis",
        "Summary",
      ]);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.spreadsheetId).toStrictEqual("new-sheet-456");
      }

      expect(mockSheets.spreadsheets.create).toHaveBeenCalledWith({
        requestBody: {
          properties: {
            title: "Multi Sheet",
          },
          sheets: [
            {
              properties: {
                title: "Data",
                index: 0,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
            {
              properties: {
                title: "Analysis",
                index: 1,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
            {
              properties: {
                title: "Summary",
                index: 2,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
          ],
        },
      });
    });

    test("正常系: 空のシートタイトル配列", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "empty-sheets",
          spreadsheetUrl: "https://docs.google.com/spreadsheets/d/empty-sheets",
        },
      };

      mockSheets.spreadsheets.create.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.createSpreadsheet(
        "Empty Sheets",
        [],
      );

      expect(result.ok).toStrictEqual(true);

      expect(mockSheets.spreadsheets.create).toHaveBeenCalledWith({
        requestBody: {
          properties: {
            title: "Empty Sheets",
          },
        },
      });
    });

    test("異常系: spreadsheetIdが返されない", async () => {
      const mockResponse = {
        data: {
          spreadsheetUrl: "https://docs.google.com/spreadsheets/d/invalid",
        },
      };

      mockSheets.spreadsheets.create.mockResolvedValue(mockResponse);

      const result =
        await spreadsheetsApi.createSpreadsheet("Invalid Response");

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Failed to create spreadsheet",
        );
      }
    });

    test("異常系: spreadsheetUrlが返されない", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "no-url",
        },
      };

      mockSheets.spreadsheets.create.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.createSpreadsheet("No URL");

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Failed to create spreadsheet",
        );
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Permission denied");
      (error as any).response = {
        status: 403,
        data: { error: "Forbidden" },
      };
      mockSheets.spreadsheets.create.mockRejectedValue(error);

      const result = await spreadsheetsApi.createSpreadsheet("Forbidden Sheet");

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to create spreadsheet");
        expect(result.error.message).toContain("Permission denied");
        expect(result.error.statusCode).toStrictEqual(403);
        expect(result.error.details).toStrictEqual({ error: "Forbidden" });
      }
    });

    test("境界値: 空文字のタイトル", async () => {
      const mockResponse = {
        data: {
          spreadsheetId: "empty-title",
          spreadsheetUrl: "https://docs.google.com/spreadsheets/d/empty-title",
        },
      };

      mockSheets.spreadsheets.create.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.createSpreadsheet("");

      expect(result.ok).toStrictEqual(true);
      expect(mockSheets.spreadsheets.create).toHaveBeenCalledWith({
        requestBody: {
          properties: {
            title: "",
          },
        },
      });
    });
  });

  describe("getValues", () => {
    test("正常系: 範囲の値を取得する", async () => {
      const mockResponse = {
        data: {
          values: [
            ["Name", "Age", "City"],
            ["Alice", 30, "Tokyo"],
            ["Bob", 25, "Osaka"],
          ],
        },
      };

      mockSheets.spreadsheets.values.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:C3" as Range,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([
          ["Name", "Age", "City"],
          ["Alice", 30, "Tokyo"],
          ["Bob", 25, "Osaka"],
        ]);
      }

      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:C3",
        valueRenderOption: "UNFORMATTED_VALUE",
      });
    });

    test("正常系: 値が存在しない場合は空配列を返す", async () => {
      const mockResponse = {
        data: {},
      };

      mockSheets.spreadsheets.values.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([]);
      }
    });

    test("正常系: 空の値配列", async () => {
      const mockResponse = {
        data: {
          values: [],
        },
      };

      mockSheets.spreadsheets.values.get.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.getValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([]);
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Invalid range");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.values.get.mockRejectedValue(error);

      const result = await spreadsheetsApi.getValues(
        "sheet-123" as SpreadsheetId,
        "InvalidRange" as Range,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to get values");
        expect(result.error.message).toContain("Invalid range");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });
  });

  describe("updateValues", () => {
    test("正常系: 範囲の値を更新する", async () => {
      const mockResponse = {
        data: {
          updatedCells: 6,
          updatedRows: 2,
          updatedColumns: 3,
          updatedRange: "Sheet1!A1:C2",
        },
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue(mockResponse);

      const values: CellValue[][] = [
        ["Name", "Age", "City"],
        ["Charlie", 35, "Kyoto"],
      ];

      const result = await spreadsheetsApi.updateValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:C2" as Range,
        values,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          updatedCells: 6,
          updatedRows: 2,
          updatedColumns: 3,
          updatedRange: "Sheet1!A1:C2",
        });
      }

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:C2",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });
    });

    test("異常系: updatedCellsが返されない", async () => {
      const mockResponse = {
        data: {
          updatedRange: "Sheet1!A1:A1",
        },
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.updateValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
        [["test"]],
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("No cells were updated");
      }
    });

    test("異常系: updatedRangeが返されない", async () => {
      const mockResponse = {
        data: {
          updatedCells: 1,
        },
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.updateValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
        [["test"]],
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("No cells were updated");
      }
    });

    test("正常系: 一部の更新情報が欠如している場合はデフォルト値を使用", async () => {
      const mockResponse = {
        data: {
          updatedCells: 3,
          updatedRange: "Sheet1!A1:C1",
          // updatedRowsとupdatedColumnsが欠如
        },
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.updateValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:C1" as Range,
        [["A", "B", "C"]],
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          updatedCells: 3,
          updatedRows: 0,
          updatedColumns: 0,
          updatedRange: "Sheet1!A1:C1",
        });
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Update failed");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.values.update.mockRejectedValue(error);

      const result = await spreadsheetsApi.updateValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
        [["test"]],
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to update values");
        expect(result.error.message).toContain("Update failed");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });

    test("境界値: 空の値配列", async () => {
      const mockResponse = {
        data: {
          updatedCells: 1,
          updatedRows: 0,
          updatedColumns: 0,
          updatedRange: "Sheet1!A1:A1",
        },
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.updateValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
        [],
      );

      expect(result.ok).toStrictEqual(true);
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [],
        },
      });
    });
  });

  describe("batchUpdate", () => {
    test("正常系: 複数範囲を一括更新する", async () => {
      const mockResponse = {
        data: {
          totalUpdatedCells: 10,
          responses: [
            {
              updatedCells: 6,
              updatedRows: 2,
              updatedColumns: 3,
              updatedRange: "Sheet1!A1:C2",
            },
            {
              updatedCells: 4,
              updatedRows: 2,
              updatedColumns: 2,
              updatedRange: "Sheet1!D1:E2",
            },
          ],
        },
      };

      mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue(
        mockResponse,
      );

      const request: BatchUpdateRequest = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        ranges: [
          {
            range: "Sheet1!A1:C2" as Range,
            values: [
              ["A", "B", "C"],
              ["1", "2", "3"],
            ],
          },
          {
            range: "Sheet1!D1:E2" as Range,
            values: [
              ["D", "E"],
              ["4", "5"],
            ],
          },
        ],
      };

      const result = await spreadsheetsApi.batchUpdate(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.totalUpdatedCells).toStrictEqual(10);
        expect(result.value.responses).toHaveLength(2);
        expect(result.value.responses[0]).toStrictEqual({
          updatedCells: 6,
          updatedRows: 2,
          updatedColumns: 3,
          updatedRange: "Sheet1!A1:C2",
        });
        expect(result.value.responses[1]).toStrictEqual({
          updatedCells: 4,
          updatedRows: 2,
          updatedColumns: 2,
          updatedRange: "Sheet1!D1:E2",
        });
      }

      expect(mockSheets.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: "Sheet1!A1:C2",
              values: [
                ["A", "B", "C"],
                ["1", "2", "3"],
              ],
            },
            {
              range: "Sheet1!D1:E2",
              values: [
                ["D", "E"],
                ["4", "5"],
              ],
            },
          ],
        },
      });
    });

    test("異常系: responsesが返されない", async () => {
      const mockResponse = {
        data: {
          totalUpdatedCells: 0,
        },
      };

      mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue(
        mockResponse,
      );

      const request: BatchUpdateRequest = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        ranges: [
          {
            range: "Sheet1!A1:A1" as Range,
            values: [["test"]],
          },
        ],
      };

      const result = await spreadsheetsApi.batchUpdate(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("No batch update response");
      }
    });

    test("正常系: 一部の更新情報が欠如している場合はデフォルト値を使用", async () => {
      const mockResponse = {
        data: {
          totalUpdatedCells: 1,
          responses: [
            {
              updatedRange: "Sheet1!A1:A1",
              // 他の情報が欠如
            },
          ],
        },
      };

      mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue(
        mockResponse,
      );

      const request: BatchUpdateRequest = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        ranges: [
          {
            range: "Sheet1!A1:A1" as Range,
            values: [["test"]],
          },
        ],
      };

      const result = await spreadsheetsApi.batchUpdate(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.totalUpdatedCells).toStrictEqual(1);
        expect(result.value.responses[0]).toStrictEqual({
          updatedCells: 0,
          updatedRows: 0,
          updatedColumns: 0,
          updatedRange: "Sheet1!A1:A1",
        });
      }
    });

    test("正常系: totalUpdatedCellsが欠如している場合はデフォルト値を使用", async () => {
      const mockResponse = {
        data: {
          responses: [
            {
              updatedCells: 1,
              updatedRows: 1,
              updatedColumns: 1,
              updatedRange: "Sheet1!A1:A1",
            },
          ],
        },
      };

      mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue(
        mockResponse,
      );

      const request: BatchUpdateRequest = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        ranges: [
          {
            range: "Sheet1!A1:A1" as Range,
            values: [["test"]],
          },
        ],
      };

      const result = await spreadsheetsApi.batchUpdate(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.totalUpdatedCells).toStrictEqual(0);
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Batch update failed");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.values.batchUpdate.mockRejectedValue(error);

      const request: BatchUpdateRequest = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        ranges: [
          {
            range: "Sheet1!A1:A1" as Range,
            values: [["test"]],
          },
        ],
      };

      const result = await spreadsheetsApi.batchUpdate(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to batch update");
        expect(result.error.message).toContain("Batch update failed");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });

    test("境界値: 空の範囲配列", async () => {
      const mockResponse = {
        data: {
          totalUpdatedCells: 0,
          responses: [],
        },
      };

      mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue(
        mockResponse,
      );

      const request: BatchUpdateRequest = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        ranges: [],
      };

      const result = await spreadsheetsApi.batchUpdate(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.responses).toStrictEqual([]);
      }

      expect(mockSheets.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [],
        },
      });
    });
  });

  describe("appendRows", () => {
    test("正常系: 行を追加する", async () => {
      const mockResponse = {
        data: {
          updates: {
            updatedCells: 6,
            updatedRows: 2,
            updatedColumns: 3,
            updatedRange: "Sheet1!A2:C3",
          },
        },
      };

      mockSheets.spreadsheets.values.append.mockResolvedValue(mockResponse);

      const values: CellValue[][] = [
        ["Alice", 30, "Tokyo"],
        ["Bob", 25, "Osaka"],
      ];

      const result = await spreadsheetsApi.appendRows(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A:C" as Range,
        values,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          updatedCells: 6,
          updatedRows: 2,
          updatedColumns: 3,
          updatedRange: "Sheet1!A2:C3",
        });
      }

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        range: "Sheet1!A:C",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values,
        },
      });
    });

    test("異常系: updatesが返されない", async () => {
      const mockResponse = {
        data: {},
      };

      mockSheets.spreadsheets.values.append.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.appendRows(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A:A" as Range,
        [["test"]],
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("No rows were appended");
      }
    });

    test("正常系: 一部の更新情報が欠如している場合はデフォルト値を使用", async () => {
      const mockResponse = {
        data: {
          updates: {
            updatedRange: "Sheet1!A1:A1",
            // 他の情報が欠如
          },
        },
      };

      mockSheets.spreadsheets.values.append.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.appendRows(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A:A" as Range,
        [["test"]],
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          updatedCells: 0,
          updatedRows: 0,
          updatedColumns: 0,
          updatedRange: "Sheet1!A1:A1",
        });
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Append failed");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.values.append.mockRejectedValue(error);

      const result = await spreadsheetsApi.appendRows(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A:A" as Range,
        [["test"]],
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to append rows");
        expect(result.error.message).toContain("Append failed");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });

    test("境界値: 空の値配列", async () => {
      const mockResponse = {
        data: {
          updates: {
            updatedCells: 0,
            updatedRows: 0,
            updatedColumns: 0,
            updatedRange: "Sheet1!A1:A1",
          },
        },
      };

      mockSheets.spreadsheets.values.append.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.appendRows(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A:A" as Range,
        [],
      );

      expect(result.ok).toStrictEqual(true);
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        range: "Sheet1!A:A",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [],
        },
      });
    });
  });

  describe("clearValues", () => {
    test("正常系: 範囲の値をクリアする", async () => {
      const mockResponse = {
        data: {
          clearedRange: "Sheet1!A1:C3",
        },
      };

      mockSheets.spreadsheets.values.clear.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.clearValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:C3" as Range,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.clearedRange).toStrictEqual("Sheet1!A1:C3");
      }

      expect(mockSheets.spreadsheets.values.clear).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:C3",
      });
    });

    test("正常系: clearedRangeが返されない場合は元の範囲を使用", async () => {
      const mockResponse = {
        data: {},
      };

      mockSheets.spreadsheets.values.clear.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.clearValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.clearedRange).toStrictEqual("Sheet1!A1:A1");
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Clear failed");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.values.clear.mockRejectedValue(error);

      const result = await spreadsheetsApi.clearValues(
        "sheet-123" as SpreadsheetId,
        "Sheet1!A1:A1" as Range,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to clear values");
        expect(result.error.message).toContain("Clear failed");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });
  });

  describe("addSheet", () => {
    test("正常系: デフォルトパラメータでシートを追加する", async () => {
      const mockResponse = {
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: 123456789,
                  title: "New Sheet",
                  index: 1,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 26,
                  },
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "New Sheet",
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          sheetId: 123456789,
          title: "New Sheet",
          index: 1,
          rowCount: 1000,
          columnCount: 26,
        });
      }

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "New Sheet",
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 26,
                  },
                },
              },
            },
          ],
        },
      });
    });

    test("正常系: カスタムパラメータでシートを追加する", async () => {
      const mockResponse = {
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: 987654321,
                  title: "Custom Sheet",
                  index: 2,
                  gridProperties: {
                    rowCount: 500,
                    columnCount: 10,
                  },
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Custom Sheet",
        500,
        10,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          sheetId: 987654321,
          title: "Custom Sheet",
          index: 2,
          rowCount: 500,
          columnCount: 10,
        });
      }

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "Custom Sheet",
                  gridProperties: {
                    rowCount: 500,
                    columnCount: 10,
                  },
                },
              },
            },
          ],
        },
      });
    });

    test("正常系: レスポンスのタイトルが空の場合はリクエストのタイトルを使用", async () => {
      const mockResponse = {
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: 555,
                  index: 0,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 26,
                  },
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Fallback Title",
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.title).toStrictEqual("Fallback Title");
      }
    });

    test("異常系: repliesが返されない", async () => {
      const mockResponse = {
        data: {},
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Failed Sheet",
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("Failed to add sheet");
      }
    });

    test("異常系: addSheetプロパティが返されない", async () => {
      const mockResponse = {
        data: {
          replies: [{}],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Failed Sheet",
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("Failed to add sheet");
      }
    });

    test("異常系: sheetIdが返されない", async () => {
      const mockResponse = {
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  title: "No ID Sheet",
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "No ID Sheet",
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Sheet ID is missing in response",
        );
      }
    });

    test("異常系: sheetIdがnull", async () => {
      const mockResponse = {
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: null,
                  title: "Null ID Sheet",
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Null ID Sheet",
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Sheet ID is missing in response",
        );
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Add sheet failed");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.batchUpdate.mockRejectedValue(error);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Failed Sheet",
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to add sheet");
        expect(result.error.message).toContain("Add sheet failed");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });

    test("境界値: 0行0列のシート", async () => {
      const mockResponse = {
        data: {
          replies: [
            {
              addSheet: {
                properties: {
                  sheetId: 0,
                  title: "Empty Sheet",
                  index: 0,
                  gridProperties: {
                    rowCount: 0,
                    columnCount: 0,
                  },
                },
              },
            },
          ],
        },
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue(mockResponse);

      const result = await spreadsheetsApi.addSheet(
        "sheet-123" as SpreadsheetId,
        "Empty Sheet",
        0,
        0,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.rowCount).toStrictEqual(0);
        expect(result.value.columnCount).toStrictEqual(0);
      }
    });
  });

  describe("deleteSheet", () => {
    test("正常系: シートを削除する", async () => {
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      const result = await spreadsheetsApi.deleteSheet(
        "sheet-123" as SpreadsheetId,
        123456789 as SheetId,
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual(undefined);
      }

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: 123456789,
              },
            },
          ],
        },
      });
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Delete sheet failed");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockSheets.spreadsheets.batchUpdate.mockRejectedValue(error);

      const result = await spreadsheetsApi.deleteSheet(
        "sheet-123" as SpreadsheetId,
        123456789 as SheetId,
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to delete sheet");
        expect(result.error.message).toContain("Delete sheet failed");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });

    test("境界値: sheetId 0", async () => {
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      const result = await spreadsheetsApi.deleteSheet(
        "sheet-123" as SpreadsheetId,
        0 as SheetId,
      );

      expect(result.ok).toStrictEqual(true);
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: 0,
              },
            },
          ],
        },
      });
    });

    test("境界値: 負のsheetId", async () => {
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      const result = await spreadsheetsApi.deleteSheet(
        "sheet-123" as SpreadsheetId,
        -1 as SheetId,
      );

      expect(result.ok).toStrictEqual(true);
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: "sheet-123",
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: -1,
              },
            },
          ],
        },
      });
    });
  });
});
