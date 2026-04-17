import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./audit-log.service";
import { deleteOldAuditLogs } from "./audit-log.writer";
import * as logger from "../../shared/utils/logger";

// IPC入力のバリデーションスキーマ
const listAllSchema = z.object({
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  statusFilter: z.enum(["all", "success", "error"]).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

const listByServerSchema = z.object({
  serverId: z.number().int().positive(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  statusFilter: z.enum(["all", "success", "error"]).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

/**
 * 監査ログ関連の IPC ハンドラーを設定
 */
export const setupAuditLogIpc = (): void => {
  // 全サーバー横断で監査ログ一覧取得
  ipcMain.handle("audit:list", async (_, input: unknown) => {
    try {
      const validated = listAllSchema.parse(input);
      return await service.listAll(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to list all audit logs",
        error instanceof Error ? error : { error },
      );
      throw new Error(`監査ログの取得に失敗しました: ${message}`);
    }
  });

  // サーバー指定で監査ログ一覧取得
  ipcMain.handle("audit:list-by-server", async (_, input: unknown) => {
    try {
      const validated = listByServerSchema.parse(input);
      return await service.listByServer(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to list audit logs by server",
        error instanceof Error ? error : { error },
      );
      throw new Error(`監査ログの取得に失敗しました: ${message}`);
    }
  });

  // 古い監査ログを削除（7日以上）
  ipcMain.handle("audit:clear", async () => {
    try {
      return await deleteOldAuditLogs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to clear old audit logs",
        error instanceof Error ? error : { error },
      );
      throw new Error(`監査ログの削除に失敗しました: ${message}`);
    }
  });
};
