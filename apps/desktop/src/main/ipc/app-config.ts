import { ipcMain } from "electron";
import { getAppStore } from "../shared/app-store";
import type { ThemeMode } from "../shared/app-store";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark";

// テーマ永続化 IPC（getTheme: 保存値取得、setTheme: 保存）
export const setupAppConfigIpc = (): void => {
  ipcMain.handle("appConfig:getTheme", async (): Promise<ThemeMode | null> => {
    const store = await getAppStore();
    const theme = store.get("theme");
    return isThemeMode(theme) ? theme : null;
  });

  ipcMain.handle("appConfig:setTheme", async (_event, theme: unknown) => {
    if (!isThemeMode(theme)) {
      throw new Error("テーマは 'light' または 'dark' で指定してください");
    }
    const store = await getAppStore();
    store.set("theme", theme);
  });
};
