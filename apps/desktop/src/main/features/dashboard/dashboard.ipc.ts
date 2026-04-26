import { ipcMain } from "electron";
import { z } from "zod";
import * as service from "./dashboard.service";
import type { DashboardInput } from "./dashboard.types";
import * as logger from "../../shared/utils/logger";

// IPC入力のバリデーションスキーマ
const dashboardInputSchema = z.object({
  period: z.enum(["24h", "7d", "30d"]),
}) satisfies z.ZodType<DashboardInput>;

/**
 * ダッシュボード関連の IPC ハンドラーを設定
 */
export const setupDashboardIpc = (): void => {
  // ダッシュボード集計データを取得
  ipcMain.handle("dashboard:get", async (_, input: unknown) => {
    try {
      const validated = dashboardInputSchema.parse(input);
      return await service.getDashboard(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to get dashboard data",
        error instanceof Error ? error : { error },
      );
      throw new Error(`ダッシュボードデータの取得に失敗しました: ${message}`);
    }
  });
};
