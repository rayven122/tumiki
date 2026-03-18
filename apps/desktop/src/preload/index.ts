import { contextBridge, ipcRenderer } from "electron";
import type { AuthTokenData } from "../types/auth";

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
    getToken: (): Promise<string | null> => ipcRenderer.invoke("auth:getToken"),
    saveToken: (tokenData: AuthTokenData): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:saveToken", tokenData),
    clearToken: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:clearToken"),
    isAuthenticated: (): Promise<boolean> =>
      ipcRenderer.invoke("auth:isAuthenticated"),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
