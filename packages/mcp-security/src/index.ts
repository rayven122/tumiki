/**
 * @tumiki/mcp-security
 *
 * MCP サーバーのセキュリティスキャンとバージョン管理
 */

// ============================================================
// セキュリティスキャン (security/)
// ============================================================

// 型定義
export type {
  Vulnerability,
  VulnerabilityType,
  Severity,
  ScanResult,
  ScanStatus,
  ScanInput,
  ToolDefinition,
  VulnerabilityCheckResult,
  McpScanOutput,
} from "./security/index.js";

// スキーマ（バリデーション用）
export {
  VulnerabilitySchema,
  VulnerabilityTypeSchema,
  SeveritySchema,
  ScanResultSchema,
  ScanStatusSchema,
  ScanInputSchema,
  ToolDefinitionSchema,
  McpScanOutputSchema,
} from "./security/index.js";

// スキャナー
export {
  scanToolsForVulnerabilities,
  isMcpScanAvailable,
} from "./security/index.js";

// 脆弱性チェッカー
export {
  checkToolsForNewServer,
  formatScanResultForDb,
  toToolDefinition,
  formatVulnerabilityError,
} from "./security/index.js";

// ============================================================
// バージョン管理 (versioning/)
// ============================================================

// 型定義
export type {
  ToolSnapshot,
  ToolChanges,
  ModifiedTool,
  ScanType,
  CreateVersionInput,
  CreateVersionResult,
} from "./versioning/index.js";

// スキーマ（バリデーション用）
export {
  ToolSnapshotSchema,
  ToolChangesSchema,
  ModifiedToolSchema,
} from "./versioning/index.js";

// 差分検出
export {
  detectToolChanges,
  applyChangesToTools,
  reconstructToolsFromChanges,
} from "./versioning/index.js";

// バージョン管理
export {
  createVersionIfChanged,
  getToolsAtVersion,
  getPendingChanges,
  mergeChanges,
  createInitialChanges,
} from "./versioning/index.js";
