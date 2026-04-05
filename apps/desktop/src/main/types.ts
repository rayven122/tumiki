/**
 * main プロセスから外部（preload / renderer）に公開する型
 */

// MCP feature
export type {
  McpServerItem,
  McpConnectionItem,
  CreateFromCatalogInput,
  UpdateServerInput,
  DeleteServerInput,
  ToggleServerInput,
} from "./features/mcp/mcp.types";
