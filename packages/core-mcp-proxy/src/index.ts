// 型
export type {
  ServerStatus,
  AuthType,
  StdioServerConfig,
  SseServerConfig,
  StreamableHttpServerConfig,
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
  ToolCallEvent,
  ToolCallHook,
} from "./types.js";

// MCPクライアントヘルパー
export type {
  McpClientConnection,
  McpClientConnectionOptions,
} from "./outbound/mcp-client.js";
export { connectMcpClient, createMcpClient } from "./outbound/mcp-client.js";

// コア
export { createProxyCore, createSingleServerCore } from "./core.js";
export type { ProxyCore } from "./core.js";

// CLI
export type { ProxyHooks } from "./cli.js";

// Inbound
export { startStdioInbound } from "./inbound/stdio-inbound.js";

// Logger
export { stderrLogger } from "./stderr-logger.js";
