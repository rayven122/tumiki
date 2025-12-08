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
    // トークン管理
    getToken: (): Promise<string | null> => ipcRenderer.invoke("auth:getToken"),
    saveToken: (tokenData: AuthTokenData): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:saveToken", tokenData),
    clearToken: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:clearToken"),
    isAuthenticated: (): Promise<boolean> =>
      ipcRenderer.invoke("auth:isAuthenticated"),

    // OAuth認証フロー
    login: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:login"),
    logout: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:logout"),
    refreshToken: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("auth:refreshToken"),

    // 認証コールバックイベント
    onCallbackSuccess: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("auth:callback-success", listener);
      // クリーンアップ関数を返す
      return () => {
        ipcRenderer.removeListener("auth:callback-success", listener);
      };
    },
    onCallbackError: (callback: (error: string) => void) => {
      const listener = (_: unknown, error: string) => callback(error);
      ipcRenderer.on("auth:callback-error", listener);
      // クリーンアップ関数を返す
      return () => {
        ipcRenderer.removeListener("auth:callback-error", listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
