import { ipcMain } from "electron";
import { getDb } from "../db";
import * as logger from "../utils/logger";

/**
 * カタログ関連の IPC ハンドラーを設定
 */
export const setupCatalogIpc = (): void => {
  // カタログ一覧取得
  ipcMain.handle("catalog:getAll", async () => {
    try {
      const db = await getDb();
      const catalogs = await db.mcpCatalog.findMany({
        orderBy: { name: "asc" },
      });

      return catalogs;
    } catch (error) {
      logger.error(
        "Failed to get catalog list",
        error instanceof Error ? error : { error },
      );
      throw new Error("カタログ一覧の取得に失敗しました");
    }
  });
};
