import { contextBridge, ipcRenderer } from "electron";
import type { AuthTokenResult } from "../types/auth";

// Electron APIを安全に公開
const api = {
  // バージョン情報
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },

  // 認証関連 API
  auth: {
    getToken: (): Promise<AuthTokenResult | null> =>
      ipcRenderer.invoke("auth:getToken"),
    isAuthenticated: (): Promise<boolean> =>
      ipcRenderer.invoke("auth:isAuthenticated"),
    clearToken: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:clearToken"),
    login: (): Promise<void> => ipcRenderer.invoke("auth:login"),
    logout: (): Promise<void> => ipcRenderer.invoke("auth:logout"),
    onCallbackSuccess: (callback: () => void): (() => void) => {
      const listener = (): void => callback();
      ipcRenderer.on("auth:callbackSuccess", listener);
      return () => ipcRenderer.removeListener("auth:callbackSuccess", listener);
    },
    onCallbackError: (callback: (error: string) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        error: string,
      ): void => callback(error);
      ipcRenderer.on("auth:callbackError", listener);
      return () => ipcRenderer.removeListener("auth:callbackError", listener);
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
