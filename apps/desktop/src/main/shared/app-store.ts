// electron-store v11 は ESM のみのため動的 import で初期化する
import type Store from "electron-store";
import type { DesktopProfile, OrganizationProfile } from "../../shared/types";

type AppStoreSchema = {
  installationId?: string;
  managerUrl?: string;
  activeProfile?: DesktopProfile;
  organizationProfile?: OrganizationProfile;
  hasCompletedInitialProfileSetup?: boolean;
};

let storeInstance: Store<AppStoreSchema> | null = null;

export const getAppStore = async (): Promise<Store<AppStoreSchema>> => {
  if (!storeInstance) {
    const { default: StoreClass } = await import("electron-store");
    storeInstance = new StoreClass<AppStoreSchema>();
  }
  return storeInstance;
};
