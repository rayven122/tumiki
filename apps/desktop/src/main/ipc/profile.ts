import { ipcMain } from "electron";
import { getDb } from "../shared/db";
import {
  clearOrganizationProfile,
  getProfileState,
  selectPersonalProfile,
} from "../shared/profile-store";
import { getOAuthManager, setOAuthManager } from "../auth/manager-registry";
import * as logger from "../shared/utils/logger";
import type { ProfileState } from "../../shared/types";

const stopOAuthManager = (): void => {
  const manager = getOAuthManager();
  manager?.cancelAuthFlow();
  manager?.stopAutoRefresh();
  setOAuthManager(null);
};

export const setupProfileIpc = (): void => {
  ipcMain.handle("profile:getState", () => getProfileState());

  ipcMain.handle("profile:selectPersonal", () => selectPersonalProfile());

  ipcMain.handle("profile:cancelOrganizationSetup", async () => {
    let profileState: ProfileState;
    try {
      profileState = await clearOrganizationProfile();
    } catch (error) {
      logger.error(
        "Failed to clear organization profile while cancelling organization setup",
        error instanceof Error ? error : { error },
      );
      throw new Error("組織利用セットアップのキャンセルに失敗しました", {
        cause: error,
      });
    }

    stopOAuthManager();

    return profileState;
  });

  ipcMain.handle("profile:disconnectOrganization", async () => {
    let profileState: ProfileState;
    try {
      profileState = await clearOrganizationProfile();
    } catch (error) {
      logger.error(
        "Failed to clear organization profile while disconnecting organization profile",
        error instanceof Error ? error : { error },
      );
      throw new Error("組織利用の停止に失敗しました", { cause: error });
    }

    stopOAuthManager();

    try {
      const db = await getDb();
      await db.authToken.deleteMany({});
    } catch (error) {
      logger.error(
        "Failed to clear auth tokens after clearing organization profile",
        error instanceof Error ? error : { error },
      );
    }

    return profileState;
  });
};
