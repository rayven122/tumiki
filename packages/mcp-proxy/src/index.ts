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
  ToolCallFilter,
} from "./types.js";

// コア
export { createProxyCore, createSingleServerCore } from "./core.js";
export type { ProxyCore } from "./core.js";

// CLI
export type { ProxyHooks } from "./cli.js";

// Inbound
export { startStdioInbound } from "./inbound/stdio-inbound.js";

// Logger
export { stderrLogger } from "./stderr-logger.js";

// PII マスキングフィルタ
export { createRedactionFilter } from "./security/redaction-filter.js";
export type {
  RedactionPolicy,
  RedactionFilterOptions,
} from "./security/redaction-filter.js";
export {
  DEFAULT_PII_MASKING_ENABLED,
  DEFAULT_REDACTION_POLICY,
  DEFAULT_REDACTOR_OPTIONS,
  DEFAULT_ALLOWLIST_TOOLS,
} from "./security/config.js";
export {
  allCustomPatterns,
  japanPatterns,
  secretPatterns,
} from "./security/patterns/index.js";
