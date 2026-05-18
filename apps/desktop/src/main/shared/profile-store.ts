import { getAppStore } from "./app-store";
import type { DesktopProfile, ProfileState } from "../../shared/types";

export type PendingProfileResolution = DesktopProfile | "error";

export const resolvePendingProfile = (
  pendingProfile: DesktopProfile | undefined,
  managerUrl: string | undefined,
  personalManagerUrl: string,
): PendingProfileResolution => {
  if (pendingProfile === "personal") {
    return "personal";
  }
  if (!pendingProfile && managerUrl === personalManagerUrl) {
    return "personal";
  }
  // 後方互換: pendingProfile 導入前の組織利用ストアは managerUrl のみで判定する。
  if (managerUrl && (pendingProfile === "organization" || !pendingProfile)) {
    return "organization";
  }
  return "error";
};

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
  // managerUrl は tumiki.cloud 認証セッション維持のため意図的に保持する。
  store.set("hasCompletedInitialProfileSetup", true);
};

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

export const restoreOrganizationProfileManagerUrl =
  async (): Promise<ProfileState> => {
    const store = await getAppStore();
    const organizationProfile = store.get("organizationProfile");
    if (store.get("activeProfile") !== "organization" || !organizationProfile) {
      throw new Error("復元できる組織利用プロファイルがありません");
    }
    store.set("managerUrl", organizationProfile.managerUrl);
    store.delete("pendingProfile");
    store.set("hasCompletedInitialProfileSetup", true);
    return getProfileState();
  };

export const resetProfileState = async (): Promise<ProfileState> => {
  const store = await getAppStore();
  // pending setup のキャンセルと組織切断の両方で、managerUrl を含む profile 状態をクリアする。
  store.delete("managerUrl");
  store.delete("pendingProfile");
  store.delete("organizationProfile");
  store.delete("activeProfile");
  store.set("hasCompletedInitialProfileSetup", false);
  return getProfileState();
};
