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

export const selectPersonalProfile = async (): Promise<ProfileState> => {
  const store = await getAppStore();
  if (store.get("activeProfile") === "organization") {
    throw new Error("組織利用中は個人利用に切り替えられません");
  }
  store.set("activeProfile", "personal");
  store.set("hasCompletedInitialProfileSetup", true);
  store.delete("managerUrl");
  store.delete("organizationProfile");
  return getProfileState();
};

export const activateOrganizationProfile = async (
  managerUrl: string,
): Promise<ProfileState> => {
  const store = await getAppStore();
  store.set("activeProfile", "organization");
  store.set("organizationProfile", {
    managerUrl,
    connectedAt: new Date().toISOString(),
  });
  store.set("hasCompletedInitialProfileSetup", true);
  return getProfileState();
};

export const clearOrganizationProfile = async (): Promise<ProfileState> => {
  const store = await getAppStore();
  store.delete("managerUrl");
  store.delete("organizationProfile");
  store.delete("activeProfile");
  store.set("hasCompletedInitialProfileSetup", false);
  return getProfileState();
};
