/**
 * main プロセスから外部（preload / renderer）に公開する型・ユーティリティ
 */

// MCP feature
export type {
  McpServerItem,
  McpConnectionItem,
  CreateFromCatalogInput,
} from "./features/mcp/mcp.types";

export { toSlug } from "./features/mcp/mcp.slug";
