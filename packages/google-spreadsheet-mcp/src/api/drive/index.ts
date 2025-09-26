import type { drive_v3 } from "googleapis";
import { google } from "googleapis";

import type { Result } from "../../lib/result/index.js";
import type { GoogleAuth } from "../auth/index.js";
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
    this.drive = google.drive({ version: "v3", auth: auth as any });
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
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to share spreadsheet: ${error.message}`,
          error.response?.status,
          error.response?.data,
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
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to get permissions: ${error.message}`,
          error.response?.status,
          error.response?.data,
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
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to remove permission: ${error.message}`,
          error.response?.status,
          error.response?.data,
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

      if (query) {
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
        name: file.name || "Untitled",
      }));

      return ok(files);
    } catch (error: any) {
      return err(
        new GoogleSheetsApiError(
          `Failed to list spreadsheets: ${error.message}`,
          error.response?.status,
          error.response?.data,
        ),
      );
    }
  }
}
