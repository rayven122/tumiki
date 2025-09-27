import type { drive_v3 } from "googleapis";
import { google } from "googleapis";

import type { Result } from "../../lib/result/index.js";
import type { GoogleAuth } from "../auth/index.js";

/*
 * Google API関連のany型使用について：
 *
 * このファイルでは以下の理由でany型を限定的に使用しています：
 *
 * 1. Google APIクライアント初期化時の型不一致
 *    - googleapis ライブラリの型定義と実際のGoogleAuth型の間に不一致があるため
 *
 * 2. Google APIエラーレスポンスの構造
 *    - Google APIのエラーオブジェクトは独自の構造を持ちますが、
 *      TypeScriptの型定義では完全にカバーされていないため
 *
 * これらは外部ライブラリとの互換性のために必要な制限的なany使用です。
 */
import type {
  Email,
  Permission,
  ShareRequest,
  SpreadsheetId,
} from "../types.js";
import { GoogleSheetsApiError } from "../../lib/errors/index.js";
import { err, ok } from "../../lib/result/index.js";

export class DriveApi {
  private drive: drive_v3.Drive;

  constructor(auth: GoogleAuth) {
    // Google Drive API クライアントが期待する認証オブジェクト型との不一致のため any を使用
    // googleapis ライブラリの型定義の制限による必要な型キャスト
    this.drive = google.drive({ version: "v3", auth: auth as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  async shareSpreadsheet(
    request: ShareRequest,
  ): Promise<Result<{ permissionId: string }, GoogleSheetsApiError>> {
    try {
      const {
        spreadsheetId,
        permission,
        sendNotificationEmails = false,
      } = request;

      const permissionBody: drive_v3.Schema$Permission = {
        type: permission.type,
        role: permission.role,
      };

      if (permission.type === "user" || permission.type === "group") {
        if (!permission.email) {
          return err(
            new GoogleSheetsApiError(
              "Email is required for user or group permissions",
            ),
          );
        }
        permissionBody.emailAddress = permission.email;
      }

      if (permission.type === "domain") {
        if (!permission.domain) {
          return err(
            new GoogleSheetsApiError(
              "Domain is required for domain permissions",
            ),
          );
        }
        permissionBody.domain = permission.domain;
      }

      const response = await this.drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: permissionBody,
        sendNotificationEmail: sendNotificationEmails,
        fields: "id",
      });

      if (!response.data.id) {
        return err(new GoogleSheetsApiError("Failed to create permission"));
      }

      return ok({ permissionId: response.data.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = (error as any)?.response?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
      const data = (error as any)?.response?.data; // eslint-disable-line @typescript-eslint/no-explicit-any
      return err(
        new GoogleSheetsApiError(
          `Failed to share spreadsheet: ${message}`,
          status,
          data,
        ),
      );
    }
  }

  async getPermissions(
    spreadsheetId: SpreadsheetId,
  ): Promise<Result<Permission[], GoogleSheetsApiError>> {
    try {
      const response = await this.drive.permissions.list({
        fileId: spreadsheetId,
        fields: "permissions(id,type,role,emailAddress,domain)",
      });

      if (!response.data.permissions) {
        return ok([]);
      }

      const permissions: Permission[] = response.data.permissions.map(
        (perm) => ({
          type: perm.type as Permission["type"],
          role: perm.role as Permission["role"],
          email: perm.emailAddress as Email | undefined,
          domain: perm.domain ?? undefined,
        }),
      );

      return ok(permissions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = (error as any)?.response?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
      const data = (error as any)?.response?.data; // eslint-disable-line @typescript-eslint/no-explicit-any
      return err(
        new GoogleSheetsApiError(
          `Failed to get permissions: ${message}`,
          status,
          data,
        ),
      );
    }
  }

  async removePermission(
    spreadsheetId: SpreadsheetId,
    permissionId: string,
  ): Promise<Result<void, GoogleSheetsApiError>> {
    try {
      await this.drive.permissions.delete({
        fileId: spreadsheetId,
        permissionId,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = (error as any)?.response?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
      const data = (error as any)?.response?.data; // eslint-disable-line @typescript-eslint/no-explicit-any
      return err(
        new GoogleSheetsApiError(
          `Failed to remove permission: ${message}`,
          status,
          data,
        ),
      );
    }
  }

  async listSpreadsheets(
    query?: string,
  ): Promise<
    Result<{ id: SpreadsheetId; name: string }[], GoogleSheetsApiError>
  > {
    try {
      const mimeType = "application/vnd.google-apps.spreadsheet";
      let q = `mimeType='${mimeType}'`;

      if (query && query.trim() !== "") {
        q += ` and name contains '${query}'`;
      }

      const response = await this.drive.files.list({
        q,
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
      });

      if (!response.data.files) {
        return ok([]);
      }

      const files = response.data.files.map((file) => ({
        id: file.id as SpreadsheetId,
        name: file.name ?? "Untitled",
      }));

      return ok(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = (error as any)?.response?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
      const data = (error as any)?.response?.data; // eslint-disable-line @typescript-eslint/no-explicit-any
      return err(
        new GoogleSheetsApiError(
          `Failed to list spreadsheets: ${message}`,
          status,
          data,
        ),
      );
    }
  }
}
