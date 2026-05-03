import { contextBridge, ipcRenderer } from "electron";
import type { AuthTokenResult } from "../types/auth";
import type { CatalogItem } from "../types/catalog";
import type { ProfileState } from "../shared/types";
import type {
  McpServerItem,
  McpServerDetailItem,
  CreateFromCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  UpdateServerInput,
  DeleteServerInput,
  ToggleServerInput,
  StartOAuthInput,
  OAuthResult,
  AuditLogListAllInput,
  AuditLogListInput,
  AuditLogListResult,
  DashboardInput,
  DashboardResult,
} from "../main/types";

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
    createCustomServer: (
      input: CreateCustomServerInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createCustomServer", input),
    createVirtualServer: (
      input: CreateVirtualServerInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createVirtualServer", input),
    getAll: (): Promise<McpServerItem[]> => ipcRenderer.invoke("mcp:getAll"),
    updateServer: (input: UpdateServerInput): Promise<McpServerItem> =>
      ipcRenderer.invoke("mcp:updateServer", input),
    deleteServer: (input: DeleteServerInput): Promise<void> =>
      ipcRenderer.invoke("mcp:deleteServer", input),
    toggleServer: (input: ToggleServerInput): Promise<McpServerItem> =>
      ipcRenderer.invoke("mcp:toggleServer", input),
    getDetail: (serverId: number): Promise<McpServerDetailItem | null> =>
      ipcRenderer.invoke("mcp-server:getDetail", serverId),
    toggleTool: (input: {
      toolId: number;
      isAllowed: boolean;
    }): Promise<void> =>
      ipcRenderer.invoke("mcp-server:toggleTool", input).then(() => undefined),
  },

  // 監査ログ API
  audit: {
    list: (input: AuditLogListAllInput): Promise<AuditLogListResult> =>
      ipcRenderer.invoke("audit:list", input),
    listByServer: (input: AuditLogListInput): Promise<AuditLogListResult> =>
      ipcRenderer.invoke("audit:list-by-server", input),
    prune: (): Promise<number> => ipcRenderer.invoke("audit:prune"),
  },

  // ダッシュボード API
  dashboard: {
    get: (input: DashboardInput): Promise<DashboardResult> =>
      ipcRenderer.invoke("dashboard:get", input),
  },

  // 管理サーバー連携 API
  manager: {
    getUrl: (): Promise<string | null> => ipcRenderer.invoke("manager:getUrl"),
    connect: (url: string): Promise<void> =>
      ipcRenderer.invoke("manager:connect", url),
  },

  // プロファイル管理 API
  profile: {
    getState: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:getState"),
    selectPersonal: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:selectPersonal"),
    startOrganizationSetup: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:startOrganizationSetup"),
    disconnectOrganization: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:disconnectOrganization"),
  },

  // 外部URLを既定ブラウザで開くシェル API
  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke("shell:openExternal", url),
  },

  // MCP OAuth認証 API
  oauth: {
    startAuth: (input: StartOAuthInput): Promise<void> =>
      ipcRenderer.invoke("oauth:startAuth", input),
    cancelAuth: (): Promise<void> => ipcRenderer.invoke("oauth:cancelAuth"),
    onOAuthSuccess: (callback: (result: OAuthResult) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        result: OAuthResult,
      ): void => callback(result);
      ipcRenderer.on("oauth:success", listener);
      return () => ipcRenderer.removeListener("oauth:success", listener);
    },
    onOAuthError: (callback: (error: string) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        error: string,
      ): void => callback(error);
      ipcRenderer.on("oauth:error", listener);
      return () => ipcRenderer.removeListener("oauth:error", listener);
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
