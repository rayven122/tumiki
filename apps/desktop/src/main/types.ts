/**
 * main プロセスから外部（preload / renderer）に公開する型
 */

// MCP feature
export type {
  McpServerItem,
  McpConnectionItem,
  CreateFromCatalogInput,
} from "./features/mcp-server-list/mcp.types";

// OAuth feature
export type {
  StartOAuthInput,
  OAuthResult,
} from "./features/oauth/oauth.types";
