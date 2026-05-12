/**
 * main プロセスから外部（preload / renderer）に公開する型
 */

// MCP feature
export type {
  McpServerItem,
  McpConnectionItem,
  CreateFromCatalogInput,
  CreateFromManagerCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  VirtualServerConnectionInput,
  GetToolsForConnectionsInput,
  GetToolsForConnectionsResult,
  ConnectionToolsResult,
  UpdateServerInput,
  DeleteServerInput,
  ToggleServerInput,
  UpdatePiiMaskingInput,
  UpdateToonConversionInput,
} from "./features/mcp-server-list/mcp.types";

// OAuth feature
export type {
  StartOAuthInput,
  OAuthResult,
} from "./features/oauth/oauth.types";

// MCP Server Detail feature
export type {
  McpServerDetailItem,
  McpConnectionDetailItem,
  McpToolItem,
} from "./features/mcp-server-detail/mcp-server-detail.types";

// Audit Log feature
export type {
  AuditLogItem,
  AuditLogListInput,
  AuditLogListAllInput,
  AuditLogListResult,
} from "./features/audit-log/audit-log.types";

// Dashboard feature
export type {
  DashboardPeriod,
  DashboardKpi,
  DashboardTimePoint,
  DashboardConnectorSeries,
  DashboardAiClient,
  DashboardConnectorStatus,
  DashboardConnectorCard,
  DashboardLogItem,
  DashboardInput,
  DashboardResult,
} from "./features/dashboard/dashboard.types";

// Desktop セッション機能
export type {
  DesktopSession,
  DesktopSessionFeatures,
  DesktopSessionGroup,
  DesktopSessionOrganization,
  DesktopSessionPermission,
  DesktopSessionUser,
} from "./features/desktop-session/desktop-session.types";

// MCP プロキシ起動コマンド
export type { McpProxyLaunchCommand } from "./features/mcp-proxy/launch-command";

// AI クライアント設定書き込み
export type {
  McpEntry,
  AiClientPreview,
  AiClientWriteRequest,
  AiClientWriteResult,
} from "./features/ai-client/ai-client.types";

// AI コーディングツール テレメトリ
export type {
  AiCodingTool,
  TelemetrySummaryItem,
  DailyUsageItem,
  ApplyToolSettingsResult,
  GetToolSettingsResult,
} from "./features/ai-coding-telemetry/ai-coding-telemetry.types";
