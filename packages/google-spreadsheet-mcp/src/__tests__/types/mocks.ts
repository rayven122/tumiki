import type { drive_v3, sheets_v4 } from "googleapis";
import type { Mock } from "vitest";

/**
 * Google Sheets API のモック型定義
 */
export type MockSheetsApi = {
  spreadsheets: {
    get: Mock<
      [sheets_v4.Params$Resource$Spreadsheets$Get],
      Promise<{ data: sheets_v4.Schema$Spreadsheet }>
    >;
    create: Mock<
      [sheets_v4.Params$Resource$Spreadsheets$Create],
      Promise<{ data: sheets_v4.Schema$Spreadsheet }>
    >;
    batchUpdate: Mock<
      [sheets_v4.Params$Resource$Spreadsheets$Batchupdate],
      Promise<{ data: sheets_v4.Schema$BatchUpdateSpreadsheetResponse }>
    >;
    values: {
      get: Mock<
        [sheets_v4.Params$Resource$Spreadsheets$Values$Get],
        Promise<{ data: sheets_v4.Schema$ValueRange }>
      >;
      update: Mock<
        [sheets_v4.Params$Resource$Spreadsheets$Values$Update],
        Promise<{ data: sheets_v4.Schema$UpdateValuesResponse }>
      >;
      batchUpdate: Mock<
        [sheets_v4.Params$Resource$Spreadsheets$Values$Batchupdate],
        Promise<{ data: sheets_v4.Schema$BatchUpdateValuesResponse }>
      >;
      append: Mock<
        [sheets_v4.Params$Resource$Spreadsheets$Values$Append],
        Promise<{ data: sheets_v4.Schema$AppendValuesResponse }>
      >;
      clear: Mock<
        [sheets_v4.Params$Resource$Spreadsheets$Values$Clear],
        Promise<{ data: sheets_v4.Schema$ClearValuesResponse }>
      >;
    };
  };
};

/**
 * Google Drive API のモック型定義
 */
export type MockDriveApi = {
  permissions: {
    create: Mock<
      [drive_v3.Params$Resource$Permissions$Create],
      Promise<{ data: drive_v3.Schema$Permission }>
    >;
    list: Mock<
      [drive_v3.Params$Resource$Permissions$List],
      Promise<{ data: drive_v3.Schema$PermissionList }>
    >;
    delete: Mock<[drive_v3.Params$Resource$Permissions$Delete], Promise<void>>;
  };
  files: {
    list: Mock<
      [drive_v3.Params$Resource$Files$List],
      Promise<{ data: drive_v3.Schema$FileList }>
    >;
  };
};

/**
 * Google Auth のモック型定義
 */
export type MockGoogleAuth = {
  fromJSON: Mock<[unknown], unknown>;
  OAuth2: Mock<[string, string, string], unknown>;
  GoogleAuth: Mock<[unknown], { getClient: () => Promise<unknown> }>;
};
