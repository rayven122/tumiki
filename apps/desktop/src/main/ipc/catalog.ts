import { ipcMain } from "electron";
import * as catalogService from "../services/catalog.service";
import * as logger from "../utils/logger";

/**
 * カタログ関連の IPC ハンドラーを設定
 */
export const setupCatalogIpc = (): void => {
  // カタログ一覧取得
  ipcMain.handle("catalog:getAll", async () => {
    try {
      return await catalogService.getAllCatalogs();
    } catch (error) {
      logger.error(
        "Failed to get catalog list",
        error instanceof Error ? error : { error },
      );
      throw new Error("カタログ一覧の取得に失敗しました");
    }
  });
};
