import { z } from "zod";

/**
 * mcp-scan で検出される脆弱性タイプ
 */
export const VulnerabilityTypeSchema = z.enum([
  "tool_poisoning",
  "prompt_injection",
  "cross_origin_escalation",
  "rug_pull",
  "unknown",
]);

export type VulnerabilityType = z.infer<typeof VulnerabilityTypeSchema>;

/**
 * 脆弱性の重大度
 */
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export type Severity = z.infer<typeof SeveritySchema>;

/**
 * mcp-scan で検出された個別の脆弱性
 */
export const VulnerabilitySchema = z.object({
  type: VulnerabilityTypeSchema,
  toolName: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  details: z.string().optional(),
});

export type Vulnerability = z.infer<typeof VulnerabilitySchema>;

/**
 * スキャン結果のステータス
 */
export const ScanStatusSchema = z.enum(["clean", "vulnerable", "error"]);

export type ScanStatus = z.infer<typeof ScanStatusSchema>;

/**
 * mcp-scan の実行結果
 */
export const ScanResultSchema = z.object({
  serverName: z.string(),
  scanTimestamp: z.string(),
  vulnerabilities: z.array(VulnerabilitySchema),
  status: ScanStatusSchema,
  errorMessage: z.string().optional(),
  executionTimeMs: z.number().optional(),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

/**
 * スキャン対象のツール定義
 */
export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/**
 * mcp-scan へのインプット（リモート MCP サーバー用）
 */
export const ScanInputSchema = z.object({
  /** サーバー名（識別用） */
  serverName: z.string(),
  /** リモート MCP サーバーの URL */
  serverUrl: z.string().url(),
  /** 認証ヘッダー（オプション） */
  headers: z.record(z.string(), z.string()).optional(),
});

export type ScanInput = z.infer<typeof ScanInputSchema>;

/**
 * 脆弱性チェック結果
 */
export type VulnerabilityCheckResult = {
  isVulnerable: boolean;
  scanResult: ScanResult;
};

/**
 * mcp-scan の issue 形式
 */
const McpScanIssueSchema = z.object({
  code: z.string().optional(),
  type: z.string().optional(),
  tool: z.string().optional(),
  toolName: z.string().optional(),
  description: z.string().optional(),
  message: z.string().optional(),
  severity: z.string().optional(),
  details: z.string().optional(),
});

/**
 * mcp-scan のサーバーエラー形式
 */
const McpScanServerErrorSchema = z.object({
  message: z.string().optional(),
  exception: z.string().optional(),
  is_failure: z.boolean().optional(),
});

/**
 * mcp-scan のサーバー結果形式
 */
const McpScanServerResultSchema = z.object({
  name: z.string().optional(),
  server: z.record(z.string(), z.unknown()).optional(),
  signature: z.unknown().optional(),
  error: McpScanServerErrorSchema.optional(),
  issues: z.array(McpScanIssueSchema).optional(),
});

/**
 * mcp-scan の設定ファイル結果形式
 */
const McpScanConfigResultSchema = z.object({
  client: z.string().optional(),
  path: z.string().optional(),
  servers: z.array(McpScanServerResultSchema).optional(),
  issues: z.array(McpScanIssueSchema).optional(),
  labels: z.array(z.unknown()).optional(),
  error: z.unknown().optional(),
});

/**
 * mcp-scan の JSON 出力形式
 * 実際の形式: { "/path/to/config.json": { ... } }
 */
export const McpScanOutputSchema = z.record(
  z.string(),
  McpScanConfigResultSchema,
);

export type McpScanOutput = z.infer<typeof McpScanOutputSchema>;
