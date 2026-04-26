/**
 * main プロセスから外部（preload / renderer）に公開する型
 */

// MCP feature
export type {
  McpServerItem,
  McpConnectionItem,
  CreateFromCatalogInput,
  CreateVirtualServerInput,
  VirtualServerConnectionInput,
  UpdateServerInput,
  DeleteServerInput,
  ToggleServerInput,
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
