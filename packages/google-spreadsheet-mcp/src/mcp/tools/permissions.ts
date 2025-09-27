import type { GoogleSheetsClient } from "../../api/index.js";
import type { Email, Permission, SpreadsheetId } from "../../api/types.js";
import type { Result } from "../../lib/result/index.js";
import type {
  GetPermissionsInput,
  RemovePermissionInput,
  ShareSpreadsheetInput,
} from "../types.js";
import { err, ok } from "../../lib/result/index.js";

export const handleShareSpreadsheet = async (
  client: GoogleSheetsClient,
  input: ShareSpreadsheetInput,
): Promise<Result<unknown, Error>> => {
  try {
    const permission: Permission = {
      type: input.type,
      role: input.role,
      email: input.email as Email | undefined,
      domain: input.domain,
    };

    const result = await client.drive.shareSpreadsheet({
      spreadsheetId: input.spreadsheetId as SpreadsheetId,
      permission,
      sendNotificationEmails: input.sendNotificationEmail,
    });

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      permissionId: result.value.permissionId,
      message: `Successfully shared spreadsheet with ${input.type} ${input.email ?? input.domain ?? "anyone"}`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleGetPermissions = async (
  client: GoogleSheetsClient,
  input: GetPermissionsInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.drive.getPermissions(
      input.spreadsheetId as SpreadsheetId,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      permissions: result.value,
      count: result.value.length,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const handleRemovePermission = async (
  client: GoogleSheetsClient,
  input: RemovePermissionInput,
): Promise<Result<unknown, Error>> => {
  try {
    const result = await client.drive.removePermission(
      input.spreadsheetId as SpreadsheetId,
      input.permissionId,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      message: `Successfully removed permission ${input.permissionId}`,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
