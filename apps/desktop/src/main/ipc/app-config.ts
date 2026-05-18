import { ipcMain } from "electron";
import { getAppStore } from "../shared/app-store";

export type ThemeMode = "light" | "dark";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark";

/**
 * アプリ設定の永続化 IPC
 * - appConfig:getTheme : 保存済みテーマ取得（未保存時は null）
 * - appConfig:setTheme : テーマ保存
 *
 * テーマ状態は renderer の jotai atom で扱うが、再起動間で維持するため
 * electron-store に保存する。
 */
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
