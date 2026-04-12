import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./audit-log.service";
import * as logger from "../../shared/utils/logger";

// IPC入力のバリデーションスキーマ
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
};
