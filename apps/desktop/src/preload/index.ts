import { contextBridge, ipcRenderer } from "electron";
import type { AuthTokenResult } from "../types/auth";
import type {
  CatalogItem,
  LocalCatalogItem,
  AddFromCatalogInput,
} from "../types/catalog";
import type { ProfileState } from "../shared/types";
import type {
  McpServerItem,
  McpServerDetailItem,
  CreateFromCatalogInput,
  CreateFromManagerCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  GetToolsForConnectionsInput,
  GetToolsForConnectionsResult,
  UpdateServerInput,
  DeleteServerInput,
  ToggleServerInput,
  UpdatePiiMaskingInput,
  UpdateToonConversionInput,
  UpdateDynamicSearchInput,
  RefreshToolsInput,
  RefreshToolsOutput,
  GetServerEditDetailInput,
  GetServerEditDetailOutput,
  UpdateServerConnectionCredentialsInput,
  StartOAuthInput,
  OAuthResult,
  ReauthenticateInput,
  ReauthenticateResult,
  AuditLogListAllInput,
  AuditLogListInput,
  AuditLogListResult,
  DashboardInput,
  DashboardResult,
  DesktopSession,
  McpProxyLaunchCommand,
  AiClientPreview,
  AiClientWriteRequest,
  AiClientWriteResult,
  ConfigurableAiCodingTool,
  AiCodingDashboardDetailsResult,
  TelemetrySummaryItem,
  DailyUsageItem,
  DailyModelUsageItem,
  ListTracesInput,
  ListTracesResult,
  ListMetricLogsInput,
  ListMetricLogsResult,
  ApplyToolSettingsResult,
  GetToolSettingsResult,
  ReceiverStatus,
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
    getLocalAll: (): Promise<LocalCatalogItem[]> =>
      ipcRenderer.invoke("catalog:getLocalAll"),
    add: (
      input: AddFromCatalogInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("catalog:add", input),
  },

  // MCP管理 API
  mcp: {
    createFromCatalog: (
      input: CreateFromCatalogInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createFromCatalog", input),
    createFromManagerCatalog: (
      input: CreateFromManagerCatalogInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createFromManagerCatalog", input),
    createCustomServer: (
      input: CreateCustomServerInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createCustomServer", input),
    createVirtualServer: (
      input: CreateVirtualServerInput,
    ): Promise<{ serverId: number; serverName: string }> =>
      ipcRenderer.invoke("mcp:createVirtualServer", input),
    getToolsForConnections: (
      input: GetToolsForConnectionsInput,
    ): Promise<GetToolsForConnectionsResult> =>
      ipcRenderer.invoke("mcp:getToolsForConnections", input),
    getAll: (): Promise<McpServerItem[]> => ipcRenderer.invoke("mcp:getAll"),
    updateServer: (input: UpdateServerInput): Promise<McpServerItem> =>
      ipcRenderer.invoke("mcp:updateServer", input),
    deleteServer: (input: DeleteServerInput): Promise<void> =>
      ipcRenderer.invoke("mcp:deleteServer", input),
    toggleServer: (input: ToggleServerInput): Promise<McpServerItem> =>
      ipcRenderer.invoke("mcp:toggleServer", input),
    updatePiiMasking: (input: UpdatePiiMaskingInput): Promise<void> =>
      ipcRenderer.invoke("mcp:updatePiiMasking", input),
    updateToonConversion: (input: UpdateToonConversionInput): Promise<void> =>
      ipcRenderer.invoke("mcp:updateToonConversion", input),
    updateDynamicSearch: (input: UpdateDynamicSearchInput): Promise<void> =>
      ipcRenderer.invoke("mcp:updateDynamicSearch", input),
    refreshTools: (input: RefreshToolsInput): Promise<RefreshToolsOutput> =>
      ipcRenderer.invoke("mcp:refreshTools", input),
    getDetail: (serverId: number): Promise<McpServerDetailItem | null> =>
      ipcRenderer.invoke("mcp-server:getDetail", serverId),
    toggleTool: (input: {
      toolId: number;
      isAllowed: boolean;
    }): Promise<void> =>
      ipcRenderer.invoke("mcp-server:toggleTool", input).then(() => undefined),
    getServerEditDetail: (
      input: GetServerEditDetailInput,
    ): Promise<GetServerEditDetailOutput> =>
      ipcRenderer.invoke("mcp:getServerEditDetail", input),
    updateServerConnectionCredentials: (
      input: UpdateServerConnectionCredentialsInput,
    ): Promise<void> =>
      ipcRenderer.invoke("mcp:updateServerConnectionCredentials", input),
    // AI クライアントから tumiki://reauth?connectionId=N ディープリンクが飛んできた際の
    // renderer 側ナビゲーション通知（OAuth フロー自体は main 側が同期的に起動済み）
    onReauthDeeplink: (
      callback: (payload: { connectionId: number; serverId: number }) => void,
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { connectionId: number; serverId: number },
      ): void => callback(payload);
      ipcRenderer.on("mcp:reauthDeeplink", listener);
      return () => ipcRenderer.removeListener("mcp:reauthDeeplink", listener);
    },
  },

  // MCP プロキシ起動コマンド（接続スニペット生成に利用）
  mcpProxy: {
    getLaunchCommand: (): Promise<McpProxyLaunchCommand> =>
      ipcRenderer.invoke("mcp-proxy:getLaunchCommand"),
  },

  // AI クライアント設定ファイルの自動書き込み
  aiClient: {
    getPreview: (clientId: string): Promise<AiClientPreview> =>
      ipcRenderer.invoke("aiClient:getPreview", clientId),
    writeConfig: (
      request: AiClientWriteRequest,
    ): Promise<AiClientWriteResult> =>
      ipcRenderer.invoke("aiClient:writeConfig", request),
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

  // Desktopセッション API
  desktopSession: {
    get: (): Promise<DesktopSession | null> =>
      ipcRenderer.invoke("desktopSession:get"),
  },

  // プロファイル管理 API
  profile: {
    getState: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:getState"),
    selectPersonal: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:selectPersonal"),
    cancelOrganizationSetup: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:cancelOrganizationSetup"),
    disconnectOrganization: (): Promise<ProfileState> =>
      ipcRenderer.invoke("profile:disconnectOrganization"),
  },

  // 外部URLを既定ブラウザで開くシェル API
  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke("shell:openExternal", url),
  },

  // AI コーディングツール テレメトリ API
  aiCodingTelemetry: {
    getSummary: (days: number): Promise<TelemetrySummaryItem[]> =>
      ipcRenderer.invoke("aiCodingTelemetry:getSummary", { days }),
    getDailyUsage: (days: number): Promise<DailyUsageItem[]> =>
      ipcRenderer.invoke("aiCodingTelemetry:getDailyUsage", { days }),
    getDailyModelUsage: (days: number): Promise<DailyModelUsageItem[]> =>
      ipcRenderer.invoke("aiCodingTelemetry:getDailyModelUsage", { days }),
    getDashboardDetails: (
      days: number,
    ): Promise<AiCodingDashboardDetailsResult> =>
      ipcRenderer.invoke("aiCodingTelemetry:getDashboardDetails", { days }),
    listTraces: (input: ListTracesInput): Promise<ListTracesResult> =>
      ipcRenderer.invoke("aiCodingTelemetry:listTraces", input),
    listMetricLogs: (
      input: ListMetricLogsInput,
    ): Promise<ListMetricLogsResult> =>
      ipcRenderer.invoke("aiCodingTelemetry:listMetricLogs", input),
    listMetricTools: (): Promise<string[]> =>
      ipcRenderer.invoke("aiCodingTelemetry:listMetricTools"),
    getReceiverPort: (): Promise<number> =>
      ipcRenderer.invoke("aiCodingTelemetry:getReceiverPort"),
    getReceiverStatus: (): Promise<ReceiverStatus> =>
      ipcRenderer.invoke("aiCodingTelemetry:getReceiverStatus"),
    getToolSettings: (
      tool: ConfigurableAiCodingTool,
    ): Promise<GetToolSettingsResult> =>
      ipcRenderer.invoke("aiCodingTelemetry:getToolSettings", tool),
    saveToolEnabled: (
      tool: ConfigurableAiCodingTool,
      enabled: boolean,
    ): Promise<void> =>
      ipcRenderer.invoke("aiCodingTelemetry:saveToolEnabled", {
        tool,
        enabled,
      }),
    applyToTool: (
      tool: ConfigurableAiCodingTool,
    ): Promise<ApplyToolSettingsResult> =>
      ipcRenderer.invoke("aiCodingTelemetry:applyToTool", { tool }),
    // 起動時の自動再書き込み結果を取得（マウント時の取りこぼし対策）。
    // 取得後は main 側でクリアされるため、複数回呼んでも重複表示されない。
    getPendingAutoReapplied: (): Promise<{
      tools: ConfigurableAiCodingTool[];
      port: number;
    } | null> =>
      ipcRenderer.invoke("aiCodingTelemetry:getPendingAutoReapplied"),
  },

  // MCP OAuth認証 API
  oauth: {
    startAuth: (input: StartOAuthInput): Promise<OAuthResult> =>
      ipcRenderer.invoke("oauth:startAuth", input),
    reauthenticate: (
      input: ReauthenticateInput,
    ): Promise<ReauthenticateResult> =>
      ipcRenderer.invoke("oauth:reauthenticate", input),
    cancelAuth: (): Promise<void> => ipcRenderer.invoke("oauth:cancelAuth"),
    findManualOAuthClient: (
      serverUrl: string,
    ): Promise<{ clientId: string; clientSecret: string | null } | null> =>
      ipcRenderer.invoke("oauth:findManualOAuthClient", serverUrl),
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
    onReauthSuccess: (
      callback: (result: ReauthenticateResult) => void,
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        result: ReauthenticateResult,
      ): void => callback(result);
      ipcRenderer.on("oauth:reauthSuccess", listener);
      return () => ipcRenderer.removeListener("oauth:reauthSuccess", listener);
    },
    // 再認証エラーは登録フロー（onOAuthError）と分離して購読する
    onReauthError: (callback: (error: string) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        error: string,
      ): void => callback(error);
      ipcRenderer.on("oauth:reauthError", listener);
      return () => ipcRenderer.removeListener("oauth:reauthError", listener);
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
