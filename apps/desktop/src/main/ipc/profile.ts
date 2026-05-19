import { ipcMain } from "electron";
import { getDb } from "../shared/db";
import {
  getProfileState,
  resetProfileState,
  restoreProfileManagerUrlAfterOrganizationChange,
} from "../shared/profile-store";
import { getOAuthManager, setOAuthManager } from "../auth/manager-registry";
import { PERSONAL_PROFILE_MANAGER_URL } from "../../shared/constants";
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

  ipcMain.handle("profile:cancelPendingSetup", async () => {
    let profileState: ProfileState;
    try {
      profileState = await resetProfileState();
    } catch (error) {
      logger.error(
        "Failed to clear profile state while cancelling pending setup",
        error instanceof Error ? error : { error },
      );
      throw new Error("セットアップのキャンセルに失敗しました", {
        cause: error,
      });
    }

    stopOAuthManager();

    return profileState;
  });

  ipcMain.handle("profile:resetForLogout", async () => {
    let profileState: ProfileState;
    try {
      profileState = await resetProfileState();
    } catch (error) {
      logger.error(
        "Failed to clear profile state while logging out",
        error instanceof Error ? error : { error },
      );
      throw new Error("ログアウト後のプロファイルリセットに失敗しました", {
        cause: error,
      });
    }

    stopOAuthManager();

    return profileState;
  });

  ipcMain.handle("profile:cancelOrganizationChange", async () => {
    let profileState: ProfileState;
    try {
      profileState = await restoreProfileManagerUrlAfterOrganizationChange(
        PERSONAL_PROFILE_MANAGER_URL,
      );
    } catch (error) {
      logger.error(
        "Failed to restore organization profile while cancelling organization change",
        error instanceof Error ? error : { error },
      );
      throw new Error("組織変更のキャンセルに失敗しました", {
        cause: error,
      });
    }

    stopOAuthManager();

    return profileState;
  });

  ipcMain.handle("profile:disconnectOrganization", async () => {
    let profileState: ProfileState;
    try {
      const currentProfileState = await getProfileState();
      if (currentProfileState.activeProfile !== "organization") {
        throw new Error("組織利用プロファイルがアクティブではありません");
      }
      profileState = await resetProfileState();
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
