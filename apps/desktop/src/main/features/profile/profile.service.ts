import { getOAuthManager, setOAuthManager } from "../../auth/manager-registry";
import { getDb } from "../../shared/db";
import { clearOrganizationProfile } from "../../shared/profile-store";
import * as logger from "../../shared/utils/logger";
import type { ProfileState } from "../../../shared/types";

export const disconnectOrganizationProfile =
  async (): Promise<ProfileState> => {
    const manager = getOAuthManager();
    manager?.cancelAuthFlow();
    manager?.stopAutoRefresh();
    setOAuthManager(null);

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

    return clearOrganizationProfile();
  };
