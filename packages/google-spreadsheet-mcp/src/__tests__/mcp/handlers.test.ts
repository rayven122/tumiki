import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { handleToolCall } from "../../mcp/handlers.js";
import { TOOL_NAMES } from "../../mcp/types.js";
import type { GoogleSheetsClient } from "../../api/index.js";
import { err, ok } from "../../lib/result/index.js";

// MCPツールハンドラーのモック
vi.mock("../../mcp/tools/index.js", () => ({
  handleListSpreadsheets: vi.fn(),
  handleGetSpreadsheet: vi.fn(),
  handleCreateSpreadsheet: vi.fn(),
  handleListSheets: vi.fn(),
  handleCreateSheet: vi.fn(),
  handleDeleteSheet: vi.fn(),
  handleGetSheetData: vi.fn(),
  handleUpdateCells: vi.fn(),
  handleBatchUpdateCells: vi.fn(),
  handleAppendRows: vi.fn(),
  handleClearRange: vi.fn(),
  handleShareSpreadsheet: vi.fn(),
  handleGetPermissions: vi.fn(),
  handleRemovePermission: vi.fn(),
}));

// モックされたハンドラーをインポート
import {
  handleListSpreadsheets,
  handleGetSpreadsheet,
  handleCreateSpreadsheet,
  handleListSheets,
  handleCreateSheet,
  handleDeleteSheet,
  handleGetSheetData,
  handleUpdateCells,
  handleBatchUpdateCells,
  handleAppendRows,
  handleClearRange,
  handleShareSpreadsheet,
  handleGetPermissions,
  handleRemovePermission,
} from "../../mcp/tools/index.js";

describe("handleToolCall", () => {
  let mockClient: GoogleSheetsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as GoogleSheetsClient;
  });

  describe("LIST_SPREADSHEETS", () => {
    test("正常系: クエリなしでスプレッドシート一覧を取得する", async () => {
      const mockResult = ok([{ id: "sheet-1", name: "Test Sheet" }]);
      vi.mocked(handleListSpreadsheets).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleListSpreadsheets).toHaveBeenCalledWith(mockClient, {});
    });

    test("正常系: クエリ付きでスプレッドシート一覧を取得する", async () => {
      const mockResult = ok([{ id: "sheet-1", name: "Project Sheet" }]);
      vi.mocked(handleListSpreadsheets).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: { query: "Project" },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleListSpreadsheets).toHaveBeenCalledWith(mockClient, { query: "Project" });
    });

    test("異常系: 無効な引数でZodエラーが発生する", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: { query: 123 }, // 文字列でない
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
      expect(handleListSpreadsheets).not.toHaveBeenCalled();
    });
  });

  describe("GET_SPREADSHEET", () => {
    test("正常系: スプレッドシート情報を取得する", async () => {
      const mockResult = ok({
        spreadsheetId: "sheet-123",
        title: "Test Spreadsheet",
        sheets: [],
        url: "https://docs.google.com/spreadsheets/d/sheet-123",
      });
      vi.mocked(handleGetSpreadsheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.GET_SPREADSHEET,
          arguments: { spreadsheetId: "sheet-123" },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleGetSpreadsheet).toHaveBeenCalledWith(mockClient, { spreadsheetId: "sheet-123" });
    });

    test("異常系: spreadsheetIdが不足している", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.GET_SPREADSHEET,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
      expect(handleGetSpreadsheet).not.toHaveBeenCalled();
    });
  });

  describe("CREATE_SPREADSHEET", () => {
    test("正常系: タイトルのみでスプレッドシートを作成する", async () => {
      const mockResult = ok({
        spreadsheetId: "new-sheet-123",
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/new-sheet-123",
      });
      vi.mocked(handleCreateSpreadsheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.CREATE_SPREADSHEET,
          arguments: { title: "New Spreadsheet" },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleCreateSpreadsheet).toHaveBeenCalledWith(mockClient, { title: "New Spreadsheet" });
    });

    test("正常系: シートタイトルを指定してスプレッドシートを作成する", async () => {
      const mockResult = ok({
        spreadsheetId: "new-sheet-456",
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/new-sheet-456",
      });
      vi.mocked(handleCreateSpreadsheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.CREATE_SPREADSHEET,
          arguments: {
            title: "Multi Sheet",
            sheetTitles: ["Data", "Analysis"],
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleCreateSpreadsheet).toHaveBeenCalledWith(mockClient, {
        title: "Multi Sheet",
        sheetTitles: ["Data", "Analysis"],
      });
    });

    test("異常系: titleが不足している", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.CREATE_SPREADSHEET,
          arguments: { sheetTitles: ["Sheet1"] },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
      expect(handleCreateSpreadsheet).not.toHaveBeenCalled();
    });
  });

  describe("LIST_SHEETS", () => {
    test("正常系: シート一覧を取得する", async () => {
      const mockResult = ok([
        { sheetId: 0, title: "Sheet1", index: 0, rowCount: 1000, columnCount: 26 },
      ]);
      vi.mocked(handleListSheets).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SHEETS,
          arguments: { spreadsheetId: "sheet-123" },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleListSheets).toHaveBeenCalledWith(mockClient, { spreadsheetId: "sheet-123" });
    });

    test("異常系: spreadsheetIdが不足している", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.LIST_SHEETS,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
      expect(handleListSheets).not.toHaveBeenCalled();
    });
  });

  describe("CREATE_SHEET", () => {
    test("正常系: 新しいシートを作成する", async () => {
      const mockResult = ok({
        sheetId: 123456789,
        title: "New Sheet",
        index: 1,
        rowCount: 1000,
        columnCount: 26,
      });
      vi.mocked(handleCreateSheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.CREATE_SHEET,
          arguments: {
            spreadsheetId: "sheet-123",
            title: "New Sheet",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleCreateSheet).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        title: "New Sheet",
        rowCount: 1000,
        columnCount: 26,
      });
    });

    test("異常系: 必須パラメータが不足している", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.CREATE_SHEET,
          arguments: { title: "New Sheet" }, // spreadsheetId が不足
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
      expect(handleCreateSheet).not.toHaveBeenCalled();
    });
  });

  describe("DELETE_SHEET", () => {
    test("正常系: シートを削除する", async () => {
      const mockResult = ok(undefined);
      vi.mocked(handleDeleteSheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.DELETE_SHEET,
          arguments: {
            spreadsheetId: "sheet-123",
            sheetId: 123456789,
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleDeleteSheet).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        sheetId: 123456789,
      });
    });

    test("異常系: sheetIdが数値でない", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.DELETE_SHEET,
          arguments: {
            spreadsheetId: "sheet-123",
            sheetId: "invalid-id",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
      expect(handleDeleteSheet).not.toHaveBeenCalled();
    });
  });

  describe("GET_SHEET_DATA", () => {
    test("正常系: シートデータを取得する", async () => {
      const mockResult = ok([
        ["Name", "Age", "City"],
        ["Alice", 30, "Tokyo"],
      ]);
      vi.mocked(handleGetSheetData).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.GET_SHEET_DATA,
          arguments: {
            spreadsheetId: "sheet-123",
            range: "Sheet1!A1:C2",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleGetSheetData).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:C2",
      });
    });
  });

  describe("UPDATE_CELLS", () => {
    test("正常系: セルを更新する", async () => {
      const mockResult = ok({
        updatedCells: 6,
        updatedRows: 2,
        updatedColumns: 3,
        updatedRange: "Sheet1!A1:C2",
      });
      vi.mocked(handleUpdateCells).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.UPDATE_CELLS,
          arguments: {
            spreadsheetId: "sheet-123",
            range: "Sheet1!A1:C2",
            values: [
              ["Name", "Age", "City"],
              ["Alice", 30, "Tokyo"],
            ],
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleUpdateCells).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:C2",
        values: [
          ["Name", "Age", "City"],
          ["Alice", 30, "Tokyo"],
        ],
      });
    });
  });

  describe("BATCH_UPDATE_CELLS", () => {
    test("正常系: 複数範囲を一括更新する", async () => {
      const mockResult = ok({
        totalUpdatedCells: 10,
        responses: [],
      });
      vi.mocked(handleBatchUpdateCells).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.BATCH_UPDATE_CELLS,
          arguments: {
            spreadsheetId: "sheet-123",
            updates: [
              {
                range: "Sheet1!A1:B2",
                values: [["A", "B"], ["1", "2"]],
              },
            ],
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleBatchUpdateCells).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        updates: [
          {
            range: "Sheet1!A1:B2",
            values: [["A", "B"], ["1", "2"]],
          },
        ],
      });
    });
  });

  describe("APPEND_ROWS", () => {
    test("正常系: 行を追加する", async () => {
      const mockResult = ok({
        updatedCells: 6,
        updatedRows: 2,
        updatedColumns: 3,
        updatedRange: "Sheet1!A3:C4",
      });
      vi.mocked(handleAppendRows).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.APPEND_ROWS,
          arguments: {
            spreadsheetId: "sheet-123",
            range: "Sheet1!A:C",
            values: [
              ["Alice", 30, "Tokyo"],
              ["Bob", 25, "Osaka"],
            ],
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleAppendRows).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        range: "Sheet1!A:C",
        values: [
          ["Alice", 30, "Tokyo"],
          ["Bob", 25, "Osaka"],
        ],
      });
    });
  });

  describe("CLEAR_RANGE", () => {
    test("正常系: 範囲をクリアする", async () => {
      const mockResult = ok({ clearedRange: "Sheet1!A1:C3" });
      vi.mocked(handleClearRange).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.CLEAR_RANGE,
          arguments: {
            spreadsheetId: "sheet-123",
            range: "Sheet1!A1:C3",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleClearRange).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        range: "Sheet1!A1:C3",
      });
    });
  });

  describe("SHARE_SPREADSHEET", () => {
    test("正常系: スプレッドシートを共有する", async () => {
      const mockResult = ok({ permissionId: "permission-123" });
      vi.mocked(handleShareSpreadsheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.SHARE_SPREADSHEET,
          arguments: {
            spreadsheetId: "sheet-123",
            email: "user@example.com",
            role: "reader",
            type: "user",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleShareSpreadsheet).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        email: "user@example.com",
        role: "reader",
        type: "user",
        sendNotificationEmail: false,
      });
    });
  });

  describe("GET_PERMISSIONS", () => {
    test("正常系: 権限一覧を取得する", async () => {
      const mockResult = ok([
        {
          type: "user",
          role: "reader",
          email: "user@example.com",
        },
      ]);
      vi.mocked(handleGetPermissions).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.GET_PERMISSIONS,
          arguments: {
            spreadsheetId: "sheet-123",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleGetPermissions).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
      });
    });
  });

  describe("REMOVE_PERMISSION", () => {
    test("正常系: 権限を削除する", async () => {
      const mockResult = ok(undefined);
      vi.mocked(handleRemovePermission).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.REMOVE_PERMISSION,
          arguments: {
            spreadsheetId: "sheet-123",
            permissionId: "permission-456",
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleRemovePermission).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        permissionId: "permission-456",
      });
    });
  });

  describe("未知のツール", () => {
    test("異常系: 未知のツール名でエラーを返す", async () => {
      const request = {
        params: {
          name: "unknown_tool",
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("Unknown tool: unknown_tool");
      }
    });

    test("異常系: ツール名がnull", async () => {
      const request = {
        params: {
          name: null as any,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("Unknown tool: null");
      }
    });

    test("異常系: ツール名がundefined", async () => {
      const request = {
        params: {
          name: undefined as any,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("Unknown tool: undefined");
      }
    });
  });

  describe("例外処理", () => {
    test("異常系: ハンドラー内でエラーが発生する", async () => {
      const mockError = new Error("Handler error");
      vi.mocked(handleListSpreadsheets).mockResolvedValue(err(mockError));

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toStrictEqual(mockError);
      }
    });

    test("異常系: ハンドラー内で文字列エラーが発生する", async () => {
      const stringError = "String error";
      vi.mocked(handleListSpreadsheets).mockImplementation(() => {
        throw stringError;
      });

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("String error");
      }
    });

    test("異常系: ハンドラー内でnullエラーが発生する", async () => {
      vi.mocked(handleListSpreadsheets).mockImplementation(() => {
        throw null;
      });

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toStrictEqual("null");
      }
    });

    test("異常系: Zodエラーメッセージが正しく処理される", async () => {
      // Zodエラーをモック
      const zodError = new z.ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["title"],
          message: "Expected string, received number",
        },
      ]);

      const request = {
        params: {
          name: TOOL_NAMES.CREATE_SPREADSHEET,
          arguments: { title: 123 }, // 数値を渡してZodエラーを発生させる
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
        expect(result.error.message).toContain("Expected string, received number");
      }
    });
  });

  describe("境界値テスト", () => {
    test("境界値: 空の引数オブジェクト", async () => {
      const mockResult = ok([]);
      vi.mocked(handleListSpreadsheets).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: {},
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleListSpreadsheets).toHaveBeenCalledWith(mockClient, {});
    });

    test("境界値: argumentsがnull", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: null as any,
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
    });

    test("境界値: argumentsがundefined", async () => {
      const request = {
        params: {
          name: TOOL_NAMES.LIST_SPREADSHEETS,
          arguments: undefined as any,
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain("Invalid arguments");
      }
    });

    test("境界値: 大きな数値のsheetId", async () => {
      const mockResult = ok(undefined);
      vi.mocked(handleDeleteSheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.DELETE_SHEET,
          arguments: {
            spreadsheetId: "sheet-123",
            sheetId: Number.MAX_SAFE_INTEGER,
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleDeleteSheet).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        sheetId: Number.MAX_SAFE_INTEGER,
      });
    });

    test("境界値: 負の数値のsheetId", async () => {
      const mockResult = ok(undefined);
      vi.mocked(handleDeleteSheet).mockResolvedValue(mockResult);

      const request = {
        params: {
          name: TOOL_NAMES.DELETE_SHEET,
          arguments: {
            spreadsheetId: "sheet-123",
            sheetId: -1,
          },
        },
      };

      const result = await handleToolCall(mockClient, request);

      expect(result).toStrictEqual(mockResult);
      expect(handleDeleteSheet).toHaveBeenCalledWith(mockClient, {
        spreadsheetId: "sheet-123",
        sheetId: -1,
      });
    });
  });
});