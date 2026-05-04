import { ipcMain } from "electron";
import { getDesktopSession } from "./desktop-session.service";
import * as logger from "../../shared/utils/logger";

export const setupDesktopSessionIpc = (): void => {
  ipcMain.handle("desktopSession:get", async () => {
    try {
      return await getDesktopSession();
    } catch (error) {
      logger.error(
        "Desktopセッションの取得に失敗しました",
        error instanceof Error ? error : { error },
      );
      throw error instanceof Error
        ? error
        : new Error("Desktopセッションの取得に失敗しました");
    }
  });
};
