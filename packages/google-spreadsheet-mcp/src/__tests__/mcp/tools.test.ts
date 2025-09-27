import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  handleListSpreadsheets,
  handleGetSpreadsheet,
  handleCreateSpreadsheet,
} from "../../mcp/tools/spreadsheets.js";
import type { GoogleSheetsClient } from "../../api/index.js";
import type { DriveApi } from "../../api/drive/index.js";
import type { SpreadsheetsApi } from "../../api/spreadsheets/index.js";
import { err, ok } from "../../lib/result/index.js";
import { GoogleSheetsApiError } from "../../lib/errors/index.js";
import type {
  Spreadsheet,
  SpreadsheetId,
  CreateSpreadsheetResponse,
} from "../../api/types.js";

describe("MCP Tools - Spreadsheets", () => {
  let mockClient: GoogleSheetsClient;
  let mockDriveApi: DriveApi;
  let mockSpreadsheetsApi: SpreadsheetsApi;

  beforeEach(() => {
    vi.clearAllMocks();

    // DriveApiのモック
    mockDriveApi = {
      listSpreadsheets: vi.fn(),
      shareSpreadsheet: vi.fn(),
      getPermissions: vi.fn(),
      removePermission: vi.fn(),
    } as any;

    // SpreadsheetsApiのモック
    mockSpreadsheetsApi = {
      getSpreadsheet: vi.fn(),
      createSpreadsheet: vi.fn(),
      getValues: vi.fn(),
      updateValues: vi.fn(),
      batchUpdate: vi.fn(),
      appendRows: vi.fn(),
      clearValues: vi.fn(),
      addSheet: vi.fn(),
      deleteSheet: vi.fn(),
    } as any;

    // GoogleSheetsClientのモック
    mockClient = {
      drive: mockDriveApi,
      spreadsheets: mockSpreadsheetsApi,
    };
  });

  describe("handleListSpreadsheets", () => {
    test("正常系: クエリなしでスプレッドシート一覧を取得する", async () => {
      const mockSpreadsheets = [
        { id: "sheet-1" as SpreadsheetId, name: "Test Sheet 1" },
        { id: "sheet-2" as SpreadsheetId, name: "Test Sheet 2" },
      ];

      vi.mocked(mockDriveApi.listSpreadsheets).mockResolvedValue(ok(mockSpreadsheets));

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          spreadsheets: [
            {
              id: "sheet-1",
              name: "Test Sheet 1",
              url: "https://docs.google.com/spreadsheets/d/sheet-1",
            },
            {
              id: "sheet-2",
              name: "Test Sheet 2",
              url: "https://docs.google.com/spreadsheets/d/sheet-2",
            },
          ],
          count: 2,
        });
      }

      expect(mockDriveApi.listSpreadsheets).toHaveBeenCalledWith(undefined);
    });

    test("正常系: クエリ付きでスプレッドシート一覧を取得する", async () => {
      const mockSpreadsheets = [
        { id: "sheet-1" as SpreadsheetId, name: "Project Report" },
      ];

      vi.mocked(mockDriveApi.listSpreadsheets).mockResolvedValue(ok(mockSpreadsheets));

      const result = await handleListSpreadsheets(mockClient, { query: "Project" });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          spreadsheets: [
            {
              id: "sheet-1",
              name: "Project Report",
              url: "https://docs.google.com/spreadsheets/d/sheet-1",
            },
          ],
          count: 1,
        });
      }

      expect(mockDriveApi.listSpreadsheets).toHaveBeenCalledWith("Project");
    });

    test("正常系: 空の結果", async () => {
      vi.mocked(mockDriveApi.listSpreadsheets).mockResolvedValue(ok([]));

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          spreadsheets: [],
          count: 0,
        });
      }
    });

    test("異常系: DriveApi呼び出しでエラーが発生する", async () => {
      const error = new GoogleSheetsApiError("Failed to list spreadsheets");
      vi.mocked(mockDriveApi.listSpreadsheets).mockResolvedValue(err(error));

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }

      expect(mockDriveApi.listSpreadsheets).toHaveBeenCalledWith(undefined);
    });

    test("異常系: 例外が発生する", async () => {
      const error = new Error("Network error");
      vi.mocked(mockDriveApi.listSpreadsheets).mockRejectedValue(error);

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }
    });

    test("異常系: 文字列例外が発生する", async () => {
      vi.mocked(mockDriveApi.listSpreadsheets).mockRejectedValue("String error");

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("String error");
      }
    });

    test("異常系: null例外が発生する", async () => {
      vi.mocked(mockDriveApi.listSpreadsheets).mockRejectedValue(null);

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("null");
      }
    });

    test("境界値: 大量のスプレッドシート", async () => {
      const mockSpreadsheets = Array.from({ length: 100 }, (_, i) => ({
        id: `sheet-${i}` as SpreadsheetId,
        name: `Sheet ${i}`,
      }));

      vi.mocked(mockDriveApi.listSpreadsheets).mockResolvedValue(ok(mockSpreadsheets));

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.count).toStrictEqual(100);
        expect(result.value.spreadsheets).toHaveLength(100);
      }
    });

    test("境界値: 特殊文字を含む名前", async () => {
      const mockSpreadsheets = [
        { id: "sheet-1" as SpreadsheetId, name: "Test & 日本語 (Special)" },
      ];

      vi.mocked(mockDriveApi.listSpreadsheets).mockResolvedValue(ok(mockSpreadsheets));

      const result = await handleListSpreadsheets(mockClient, {});

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.spreadsheets[0].name).toStrictEqual("Test & 日本語 (Special)");
      }
    });
  });

  describe("handleGetSpreadsheet", () => {
    test("正常系: スプレッドシート情報を取得する", async () => {
      const mockSpreadsheet: Spreadsheet = {
        spreadsheetId: "sheet-123" as SpreadsheetId,
        title: "Test Spreadsheet",
        locale: "ja_JP",
        timeZone: "Asia/Tokyo",
        sheets: [
          {
            sheetId: 0 as any,
            title: "Sheet1",
            index: 0,
            rowCount: 1000,
            columnCount: 26,
          },
          {
            sheetId: 1 as any,
            title: "Sheet2",
            index: 1,
            rowCount: 500,
            columnCount: 10,
          },
        ],
        url: "https://docs.google.com/spreadsheets/d/sheet-123",
      };

      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockResolvedValue(ok(mockSpreadsheet));

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "sheet-123",
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockSpreadsheet,
          sheetCount: 2,
        });
      }

      expect(mockSpreadsheetsApi.getSpreadsheet).toHaveBeenCalledWith("sheet-123");
    });

    test("正常系: シートが0個のスプレッドシート", async () => {
      const mockSpreadsheet: Spreadsheet = {
        spreadsheetId: "empty-sheet" as SpreadsheetId,
        title: "Empty Spreadsheet",
        sheets: [],
        url: "https://docs.google.com/spreadsheets/d/empty-sheet",
      };

      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockResolvedValue(ok(mockSpreadsheet));

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "empty-sheet",
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockSpreadsheet,
          sheetCount: 0,
        });
      }
    });

    test("異常系: SpreadsheetsApi呼び出しでエラーが発生する", async () => {
      const error = new GoogleSheetsApiError("Spreadsheet not found");
      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockResolvedValue(err(error));

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "not-found",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }

      expect(mockSpreadsheetsApi.getSpreadsheet).toHaveBeenCalledWith("not-found");
    });

    test("異常系: 例外が発生する", async () => {
      const error = new Error("Network error");
      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockRejectedValue(error);

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "sheet-123",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }
    });

    test("異常系: 文字列例外が発生する", async () => {
      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockRejectedValue("String error");

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "sheet-123",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("String error");
      }
    });

    test("境界値: 非常に長いタイトル", async () => {
      const longTitle = "A".repeat(1000);
      const mockSpreadsheet: Spreadsheet = {
        spreadsheetId: "long-title" as SpreadsheetId,
        title: longTitle,
        sheets: [
          {
            sheetId: 0 as any,
            title: "Sheet1",
            index: 0,
            rowCount: 1000,
            columnCount: 26,
          },
        ],
        url: "https://docs.google.com/spreadsheets/d/long-title",
      };

      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockResolvedValue(ok(mockSpreadsheet));

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "long-title",
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.title).toStrictEqual(longTitle);
      }
    });

    test("境界値: 空文字のspreadsheetId", async () => {
      const error = new GoogleSheetsApiError("Invalid spreadsheet ID");
      vi.mocked(mockSpreadsheetsApi.getSpreadsheet).mockResolvedValue(err(error));

      const result = await handleGetSpreadsheet(mockClient, {
        spreadsheetId: "",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }

      expect(mockSpreadsheetsApi.getSpreadsheet).toHaveBeenCalledWith("");
    });
  });

  describe("handleCreateSpreadsheet", () => {
    test("正常系: タイトルのみでスプレッドシートを作成する", async () => {
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "new-sheet-123" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/new-sheet-123",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "New Spreadsheet",
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockResponse,
          message: 'Successfully created spreadsheet "New Spreadsheet"',
        });
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "New Spreadsheet",
        undefined,
      );
    });

    test("正常系: シートタイトルを指定してスプレッドシートを作成する", async () => {
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "multi-sheet-456" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/multi-sheet-456",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "Multi Sheet",
        sheetTitles: ["Data", "Analysis", "Summary"],
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockResponse,
          message: 'Successfully created spreadsheet "Multi Sheet"',
        });
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "Multi Sheet",
        ["Data", "Analysis", "Summary"],
      );
    });

    test("正常系: 空のシートタイトル配列", async () => {
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "empty-sheets" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/empty-sheets",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "Empty Sheets",
        sheetTitles: [],
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockResponse,
          message: 'Successfully created spreadsheet "Empty Sheets"',
        });
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "Empty Sheets",
        [],
      );
    });

    test("異常系: SpreadsheetsApi呼び出しでエラーが発生する", async () => {
      const error = new GoogleSheetsApiError("Permission denied");
      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(err(error));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "Forbidden Sheet",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "Forbidden Sheet",
        undefined,
      );
    });

    test("異常系: 例外が発生する", async () => {
      const error = new Error("Network error");
      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockRejectedValue(error);

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "Error Sheet",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(error);
      }
    });

    test("異常系: 非Error例外が発生する", async () => {
      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockRejectedValue("String error");

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "String Error Sheet",
      });

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("String error");
      }
    });

    test("境界値: 空文字のタイトル", async () => {
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "empty-title" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/empty-title",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "",
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockResponse,
          message: 'Successfully created spreadsheet ""',
        });
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "",
        undefined,
      );
    });

    test("境界値: 非常に長いタイトル", async () => {
      const longTitle = "A".repeat(1000);
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "long-title" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/long-title",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: longTitle,
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.message).toStrictEqual(`Successfully created spreadsheet "${longTitle}"`);
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        longTitle,
        undefined,
      );
    });

    test("境界値: 特殊文字を含むタイトル", async () => {
      const specialTitle = "Test & 日本語 (Special) \"Quotes\" <Tags>";
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "special-title" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/special-title",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: specialTitle,
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.message).toStrictEqual(`Successfully created spreadsheet "${specialTitle}"`);
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        specialTitle,
        undefined,
      );
    });

    test("境界値: 大量のシートタイトル", async () => {
      const sheetTitles = Array.from({ length: 100 }, (_, i) => `Sheet ${i + 1}`);
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "many-sheets" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/many-sheets",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "Many Sheets",
        sheetTitles,
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockResponse,
          message: 'Successfully created spreadsheet "Many Sheets"',
        });
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "Many Sheets",
        sheetTitles,
      );
    });

    test("境界値: 空文字のシートタイトルを含む", async () => {
      const sheetTitles = ["Valid Sheet", "", "Another Sheet"];
      const mockResponse: CreateSpreadsheetResponse = {
        spreadsheetId: "empty-sheet-title" as SpreadsheetId,
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/empty-sheet-title",
      };

      vi.mocked(mockSpreadsheetsApi.createSpreadsheet).mockResolvedValue(ok(mockResponse));

      const result = await handleCreateSpreadsheet(mockClient, {
        title: "Mixed Sheet Titles",
        sheetTitles,
      });

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual({
          ...mockResponse,
          message: 'Successfully created spreadsheet "Mixed Sheet Titles"',
        });
      }

      expect(mockSpreadsheetsApi.createSpreadsheet).toHaveBeenCalledWith(
        "Mixed Sheet Titles",
        sheetTitles,
      );
    });
  });
});