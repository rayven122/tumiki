import { ipcMain } from "electron";
import {
  getProfileState,
  selectPersonalProfile,
} from "../shared/profile-store";
import { disconnectOrganizationProfile } from "../features/profile/profile.service";

export const setupProfileIpc = (): void => {
  ipcMain.handle("profile:getState", () => getProfileState());

  ipcMain.handle("profile:selectPersonal", () => selectPersonalProfile());

  ipcMain.handle("profile:startOrganizationSetup", () => getProfileState());

  ipcMain.handle("profile:disconnectOrganization", () =>
    disconnectOrganizationProfile(),
  );
};
