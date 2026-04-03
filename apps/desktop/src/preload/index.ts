import { contextBridge, ipcRenderer } from "electron";
import type { AuthTokenResult } from "../types/auth";
import type { CatalogItem } from "../types/catalog";
import type { McpServerItem, CreateFromCatalogInput } from "../main/types";
import type { McpServerState, McpToolInfo, CallToolResult } from "../main/mcp/types";

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
    login: (): Promise<void> => ipcRenderer.invoke("auth:login"),
    cancelLogin: (): Promise<void> => ipcRenderer.invoke("auth:cancelLogin"),
    logout: (): Promise<void> => ipcRenderer.invoke("auth:logout"),
    onCallbackSuccess: (callback: () => void): (() => void) => {
      // ipcRenderer.onのコールバック型に合わせるため、引数を受け取って無視する
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- IPC eventは型整合性のため受け取るが使用しない
      const listener = (_event: Electron.IpcRendererEvent): void => callback();
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
    onSessionExpired: (callback: (message: string) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        message: string,
      ): void => callback(message);
      ipcRenderer.on("auth:sessionExpired", listener);
      return () => ipcRenderer.removeListener("auth:sessionExpired", listener);
    },
  },

  // カタログ関連 API
  catalog: {
    getAll: (): Promise<CatalogItem[]> => ipcRenderer.invoke("catalog:getAll"),
  },

  // MCP管理 API
  mcp: {
    createFromCatalog: (
      input: CreateFromCatalogInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createFromCatalog", input),
    getAll: (): Promise<McpServerItem[]> => ipcRenderer.invoke("mcp:getAll"),
    // MCP Proxy API
    start: (): Promise<McpServerState[]> => ipcRenderer.invoke("mcp:start"),
    stop: (): Promise<void> => ipcRenderer.invoke("mcp:stop"),
    listTools: (): Promise<McpToolInfo[]> =>
      ipcRenderer.invoke("mcp:list-tools"),
    callTool: (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResult> =>
      ipcRenderer.invoke("mcp:call-tool", { name, arguments: args }),
    getStatus: (): Promise<McpServerState[]> =>
      ipcRenderer.invoke("mcp:status"),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
