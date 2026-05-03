import { ipcMain } from "electron";
import { getDb } from "../shared/db";
import {
  clearOrganizationProfile,
  getProfileState,
  selectPersonalProfile,
} from "../shared/profile-store";
import { getOAuthManager, setOAuthManager } from "../auth/manager-registry";
import * as logger from "../shared/utils/logger";

export const setupProfileIpc = (): void => {
  ipcMain.handle("profile:getState", () => getProfileState());

  ipcMain.handle("profile:selectPersonal", () => selectPersonalProfile());

  ipcMain.handle("profile:disconnectOrganization", async () => {
    try {
      const db = await getDb();
      await db.authToken.deleteMany({});
    } catch (error) {
      logger.error(
        "Failed to clear auth tokens while disconnecting organization profile",
        error instanceof Error ? error : { error },
      );
      throw new Error("組織利用の停止に失敗しました", { cause: error });
    }

    const manager = getOAuthManager();
    manager?.cancelAuthFlow();
    manager?.stopAutoRefresh();
    setOAuthManager(null);

    return clearOrganizationProfile();
  });
};
