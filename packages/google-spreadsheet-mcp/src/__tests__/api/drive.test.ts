import { describe, test, expect, vi, beforeEach } from "vitest";
import { google } from "googleapis";
import { DriveApi } from "../../api/drive/index.js";
import { GoogleSheetsApiError } from "../../lib/errors/index.js";
import type {
  Permission,
  ShareRequest,
  SpreadsheetId,
  Email,
} from "../../api/types.js";
import type { GoogleAuth } from "../../api/auth/index.js";

// Googleライブラリのモック
vi.mock("googleapis");

describe("DriveApi", () => {
  let driveApi: DriveApi;
  let mockAuth: GoogleAuth;
  let mockDrive: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = {} as GoogleAuth;

    mockDrive = {
      permissions: {
        create: vi.fn(),
        list: vi.fn(),
        delete: vi.fn(),
      },
      files: {
        list: vi.fn(),
      },
    };

    vi.mocked(google.drive).mockReturnValue(mockDrive);
    driveApi = new DriveApi(mockAuth);
  });

  describe("constructor", () => {
    test("正常系: DriveApiインスタンスを作成する", () => {
      expect(google.drive).toHaveBeenCalledWith({
        version: "v3",
        auth: mockAuth,
      });
      expect(driveApi).toBeInstanceOf(DriveApi);
    });
  });

  describe("shareSpreadsheet", () => {
    test("正常系: ユーザーに読み取り権限を付与する", async () => {
      const permissionId = "permission-123";
      mockDrive.permissions.create.mockResolvedValue({
        data: { id: permissionId },
      });

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "user",
          role: "reader",
          email: "test@example.com" as Email,
        },
        sendNotificationEmails: true,
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.permissionId).toStrictEqual(permissionId);
      }

      expect(mockDrive.permissions.create).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        requestBody: {
          type: "user",
          role: "reader",
          emailAddress: "test@example.com",
        },
        sendNotificationEmail: true,
        fields: "id",
      });
    });

    test("正常系: グループに編集権限を付与する", async () => {
      const permissionId = "permission-456";
      mockDrive.permissions.create.mockResolvedValue({
        data: { id: permissionId },
      });

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "group",
          role: "writer",
          email: "group@example.com" as Email,
        },
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.permissionId).toStrictEqual(permissionId);
      }

      expect(mockDrive.permissions.create).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        requestBody: {
          type: "group",
          role: "writer",
          emailAddress: "group@example.com",
        },
        sendNotificationEmail: false,
        fields: "id",
      });
    });

    test("正常系: ドメインに権限を付与する", async () => {
      const permissionId = "permission-domain";
      mockDrive.permissions.create.mockResolvedValue({
        data: { id: permissionId },
      });

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "domain",
          role: "reader",
          domain: "example.com",
        },
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.permissionId).toStrictEqual(permissionId);
      }

      expect(mockDrive.permissions.create).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        requestBody: {
          type: "domain",
          role: "reader",
          domain: "example.com",
        },
        sendNotificationEmail: false,
        fields: "id",
      });
    });

    test("正常系: 誰でもアクセス可能にする", async () => {
      const permissionId = "permission-anyone";
      mockDrive.permissions.create.mockResolvedValue({
        data: { id: permissionId },
      });

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "anyone",
          role: "reader",
        },
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value.permissionId).toStrictEqual(permissionId);
      }

      expect(mockDrive.permissions.create).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        requestBody: {
          type: "anyone",
          role: "reader",
        },
        sendNotificationEmail: false,
        fields: "id",
      });
    });

    test("異常系: ユーザータイプでメールアドレスが不足している", async () => {
      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "user",
          role: "reader",
        } as Permission,
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Email is required for user or group permissions",
        );
      }
    });

    test("異常系: グループタイプでメールアドレスが不足している", async () => {
      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "group",
          role: "writer",
        } as Permission,
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Email is required for user or group permissions",
        );
      }
    });

    test("異常系: ドメインタイプでドメインが不足している", async () => {
      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "domain",
          role: "reader",
        } as Permission,
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual(
          "Domain is required for domain permissions",
        );
      }
    });

    test("異常系: APIがpermissionIdを返さない", async () => {
      mockDrive.permissions.create.mockResolvedValue({
        data: {},
      });

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "user",
          role: "reader",
          email: "test@example.com" as Email,
        },
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toStrictEqual("Failed to create permission");
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("API Error");
      (error as any).response = {
        status: 400,
        data: { error: "Bad Request" },
      };
      mockDrive.permissions.create.mockRejectedValue(error);

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "user",
          role: "reader",
          email: "test@example.com" as Email,
        },
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to share spreadsheet");
        expect(result.error.message).toContain("API Error");
        expect(result.error.statusCode).toStrictEqual(400);
        expect(result.error.details).toStrictEqual({ error: "Bad Request" });
      }
    });

    test("異常系: 非Errorオブジェクトが投げられる", async () => {
      mockDrive.permissions.create.mockRejectedValue("String error");

      const request: ShareRequest = {
        spreadsheetId: "spreadsheet-123" as SpreadsheetId,
        permission: {
          type: "user",
          role: "reader",
          email: "test@example.com" as Email,
        },
      };

      const result = await driveApi.shareSpreadsheet(request);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to share spreadsheet");
        expect(result.error.message).toContain("Unknown error");
      }
    });
  });

  describe("getPermissions", () => {
    test("正常系: 権限リストを取得する", async () => {
      const mockPermissions = [
        {
          id: "perm-1",
          type: "user",
          role: "reader",
          emailAddress: "user1@example.com",
        },
        {
          id: "perm-2",
          type: "group",
          role: "writer",
          emailAddress: "group@example.com",
        },
        {
          id: "perm-3",
          type: "domain",
          role: "reader",
          domain: "example.com",
        },
        {
          id: "perm-4",
          type: "anyone",
          role: "reader",
        },
      ];

      mockDrive.permissions.list.mockResolvedValue({
        data: { permissions: mockPermissions },
      });

      const result = await driveApi.getPermissions("spreadsheet-123" as SpreadsheetId);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toHaveLength(4);
        expect(result.value[0]).toStrictEqual({
          type: "user",
          role: "reader",
          email: "user1@example.com",
          domain: undefined,
        });
        expect(result.value[1]).toStrictEqual({
          type: "group",
          role: "writer",
          email: "group@example.com",
          domain: undefined,
        });
        expect(result.value[2]).toStrictEqual({
          type: "domain",
          role: "reader",
          email: undefined,
          domain: "example.com",
        });
        expect(result.value[3]).toStrictEqual({
          type: "anyone",
          role: "reader",
          email: undefined,
          domain: undefined,
        });
      }

      expect(mockDrive.permissions.list).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        fields: "permissions(id,type,role,emailAddress,domain)",
      });
    });

    test("正常系: 権限が存在しない場合は空配列を返す", async () => {
      mockDrive.permissions.list.mockResolvedValue({
        data: {},
      });

      const result = await driveApi.getPermissions("spreadsheet-123" as SpreadsheetId);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([]);
      }
    });

    test("正常系: 権限が空配列の場合", async () => {
      mockDrive.permissions.list.mockResolvedValue({
        data: { permissions: [] },
      });

      const result = await driveApi.getPermissions("spreadsheet-123" as SpreadsheetId);

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([]);
      }
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Permission denied");
      (error as any).response = {
        status: 403,
        data: { error: "Forbidden" },
      };
      mockDrive.permissions.list.mockRejectedValue(error);

      const result = await driveApi.getPermissions("spreadsheet-123" as SpreadsheetId);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to get permissions");
        expect(result.error.message).toContain("Permission denied");
        expect(result.error.statusCode).toStrictEqual(403);
        expect(result.error.details).toStrictEqual({ error: "Forbidden" });
      }
    });

    test("異常系: 非Errorオブジェクトが投げられる", async () => {
      mockDrive.permissions.list.mockRejectedValue(null);

      const result = await driveApi.getPermissions("spreadsheet-123" as SpreadsheetId);

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to get permissions");
        expect(result.error.message).toContain("Unknown error");
      }
    });
  });

  describe("removePermission", () => {
    test("正常系: 権限を削除する", async () => {
      mockDrive.permissions.delete.mockResolvedValue({});

      const result = await driveApi.removePermission(
        "spreadsheet-123" as SpreadsheetId,
        "permission-456",
      );

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual(undefined);
      }

      expect(mockDrive.permissions.delete).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        permissionId: "permission-456",
      });
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Permission not found");
      (error as any).response = {
        status: 404,
        data: { error: "Not Found" },
      };
      mockDrive.permissions.delete.mockRejectedValue(error);

      const result = await driveApi.removePermission(
        "spreadsheet-123" as SpreadsheetId,
        "permission-456",
      );

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to remove permission");
        expect(result.error.message).toContain("Permission not found");
        expect(result.error.statusCode).toStrictEqual(404);
        expect(result.error.details).toStrictEqual({ error: "Not Found" });
      }
    });

    test("境界値: 空文字のpermissionId", async () => {
      mockDrive.permissions.delete.mockResolvedValue({});

      const result = await driveApi.removePermission(
        "spreadsheet-123" as SpreadsheetId,
        "",
      );

      expect(result.ok).toStrictEqual(true);
      expect(mockDrive.permissions.delete).toHaveBeenCalledWith({
        fileId: "spreadsheet-123",
        permissionId: "",
      });
    });
  });

  describe("listSpreadsheets", () => {
    test("正常系: スプレッドシート一覧を取得する", async () => {
      const mockFiles = [
        { id: "sheet-1", name: "Test Sheet 1" },
        { id: "sheet-2", name: "Test Sheet 2" },
        { id: "sheet-3", name: "Test Sheet 3" },
      ];

      mockDrive.files.list.mockResolvedValue({
        data: { files: mockFiles },
      });

      const result = await driveApi.listSpreadsheets();

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0]).toStrictEqual({
          id: "sheet-1",
          name: "Test Sheet 1",
        });
        expect(result.value[1]).toStrictEqual({
          id: "sheet-2",
          name: "Test Sheet 2",
        });
        expect(result.value[2]).toStrictEqual({
          id: "sheet-3",
          name: "Test Sheet 3",
        });
      }

      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
      });
    });

    test("正常系: クエリ文字列でフィルタしてスプレッドシート一覧を取得する", async () => {
      const mockFiles = [
        { id: "sheet-1", name: "Project Report" },
      ];

      mockDrive.files.list.mockResolvedValue({
        data: { files: mockFiles },
      });

      const result = await driveApi.listSpreadsheets("Project");

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toStrictEqual({
          id: "sheet-1",
          name: "Project Report",
        });
      }

      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and name contains 'Project'",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
      });
    });

    test("正常系: 名前がないファイルはUntitledになる", async () => {
      const mockFiles = [
        { id: "sheet-1", name: null },
        { id: "sheet-2" }, // nameプロパティなし
      ];

      mockDrive.files.list.mockResolvedValue({
        data: { files: mockFiles },
      });

      const result = await driveApi.listSpreadsheets();

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]).toStrictEqual({
          id: "sheet-1",
          name: "Untitled",
        });
        expect(result.value[1]).toStrictEqual({
          id: "sheet-2",
          name: "Untitled",
        });
      }
    });

    test("正常系: ファイルが存在しない場合は空配列を返す", async () => {
      mockDrive.files.list.mockResolvedValue({
        data: {},
      });

      const result = await driveApi.listSpreadsheets();

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([]);
      }
    });

    test("正常系: ファイルが空配列の場合", async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] },
      });

      const result = await driveApi.listSpreadsheets();

      expect(result.ok).toStrictEqual(true);
      if (result.ok) {
        expect(result.value).toStrictEqual([]);
      }
    });

    test("境界値: 空文字のクエリは無視される", async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] },
      });

      const result = await driveApi.listSpreadsheets("");

      expect(result.ok).toStrictEqual(true);
      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
      });
    });

    test("境界値: 空白のみのクエリは無視される", async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] },
      });

      const result = await driveApi.listSpreadsheets("   ");

      expect(result.ok).toStrictEqual(true);
      expect(mockDrive.files.list).toHaveBeenCalledWith({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
      });
    });

    test("異常系: API呼び出しでエラーが発生する", async () => {
      const error = new Error("Network error");
      (error as any).response = {
        status: 500,
        data: { error: "Internal Server Error" },
      };
      mockDrive.files.list.mockRejectedValue(error);

      const result = await driveApi.listSpreadsheets();

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to list spreadsheets");
        expect(result.error.message).toContain("Network error");
        expect(result.error.statusCode).toStrictEqual(500);
        expect(result.error.details).toStrictEqual({ error: "Internal Server Error" });
      }
    });

    test("異常系: 非Errorオブジェクトが投げられる", async () => {
      mockDrive.files.list.mockRejectedValue(undefined);

      const result = await driveApi.listSpreadsheets();

      expect(result.ok).toStrictEqual(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GoogleSheetsApiError);
        expect(result.error.message).toContain("Failed to list spreadsheets");
        expect(result.error.message).toContain("Unknown error");
      }
    });
  });
});