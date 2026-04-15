// 型
export type {
  ServerStatus,
  McpServerConfig,
  McpServerGroupConfig,
  McpServerState,
  McpToolInfo,
  CallToolResult,
  CallToolPayload,
  Logger,
  StartPayload,
  ProxyRequest,
  ProxyResponse,
  ProxyEvent,
} from "./types.js";

// コア
export { createProxyCore, createSingleServerCore } from "./core.js";
export type { ProxyCore } from "./core.js";

// Inbound
export { startStdioInbound } from "./inbound/stdio-inbound.js";
export { startLocalInboundServer } from "./inbound/tcp-inbound.js";
export { createMcpInboundServer } from "./inbound/mcp-inbound-server.js";

// Claude bridge path resolution
export {
  listDefaultBridgeFilePaths,
  pickNewestBridgePath,
  resolveBridgeFilePath,
  formatDefaultSearchHint,
} from "./bridge-resolve.js";

// Logger
export { stderrLogger } from "./stderr-logger.js";

// CLI（stdio MCP）
export { runMcpProxy, runMcpProxyWithCore } from "./cli.js";
