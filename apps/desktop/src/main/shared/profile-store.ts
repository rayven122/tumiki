import { getAppStore } from "./app-store";
import type { ProfileState } from "../../shared/types";

export const getProfileState = async (): Promise<ProfileState> => {
  const store = await getAppStore();
  return {
    activeProfile: store.get("activeProfile") ?? null,
    organizationProfile: store.get("organizationProfile") ?? null,
    hasCompletedInitialProfileSetup:
      store.get("hasCompletedInitialProfileSetup") ?? false,
  };
};

const confirmPersonalProfile = async (
  store: Awaited<ReturnType<typeof getAppStore>>,
): Promise<void> => {
  if (store.get("activeProfile") === "organization") {
    throw new Error("組織利用中は個人利用に切り替えられません");
  }
  store.set("activeProfile", "personal");
  store.delete("pendingProfile");
  store.delete("organizationProfile");
  store.set("hasCompletedInitialProfileSetup", true);
};

// 認証コールバック完了後に personal profile を確定する。
export const activatePersonalProfile = async (): Promise<ProfileState> => {
  const store = await getAppStore();
  await confirmPersonalProfile(store);
  return getProfileState();
};

export const activateOrganizationProfile = async (
  managerUrl: string,
): Promise<ProfileState> => {
  const store = await getAppStore();
  store.set("activeProfile", "organization");
  store.delete("pendingProfile");
  store.set("organizationProfile", {
    managerUrl,
    connectedAt: new Date().toISOString(),
  });
  store.set("hasCompletedInitialProfileSetup", true);
  return getProfileState();
};

export const clearOrganizationProfile = async (): Promise<ProfileState> => {
  const store = await getAppStore();
  // managerUrl は認証完了前のセットアップ再開と起動時OAuth初期化に使うステージングキー。
  // organizationProfile.managerUrl は認証完了後のUI表示用として保持する。
  store.delete("managerUrl");
  store.delete("pendingProfile");
  store.delete("organizationProfile");
  store.delete("activeProfile");
  store.set("hasCompletedInitialProfileSetup", false);
  return getProfileState();
};
