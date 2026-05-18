// 設定ファイルの自動書き込みに対応しているAIコーディングツール
export type ConfigurableAiCodingTool = "claude-code" | "codex";

// OTLP の service.name から観測されるAIコーディングツール名
export type AiCodingTool = string;

export type AiCodingMetricCategory =
  | "all"
  | "tokens"
  | "cost"
  | "active_time"
  | "session"
  | "tool_call"
  | "api"
  | "other";

// AI コーディングツールの正規値一覧（外部入力の検証に利用）
export const AI_CODING_TOOLS: readonly ConfigurableAiCodingTool[] = [
  "claude-code",
  "codex",
] as const;

// 文字列が正規の AiCodingTool か判定するタイプガード
export const isAiCodingTool = (
  value: string,
): value is ConfigurableAiCodingTool =>
  (AI_CODING_TOOLS as readonly string[]).includes(value);

// サマリー取得の入力
export type GetSummaryInput = { days: number };

// 日別使用量取得の入力
export type GetDailyUsageInput = { days: number };

// トレース履歴一覧取得の入力
export type ListTracesInput = {
  page?: number;
  perPage?: number;
  toolFilter?: AiCodingTool | "all";
  categoryFilter?: AiCodingMetricCategory;
  metricSearch?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ListMetricLogsInput = ListTracesInput;

// テレメトリサマリーの1件
export type TelemetrySummaryItem = {
  tool: string;
  metricName: string;
  totalValue: number;
};

// 日別使用量の1件
export type DailyUsageItem = {
  date: string;
  tool: string;
  metricName: string;
  totalValue: number;
};

// 日別・モデル別使用量の1件
export type DailyModelUsageItem = {
  date: string;
  tool: string;
  model: string;
  sampleCount: number;
  totalValue: number;
};

export type AiCodingAttributeUsageItem = {
  tool: string;
  attributeValue: string;
  totalValue: number;
  sampleCount: number;
};

export type AiCodingMemberUsageItem = {
  member: string;
  tool: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  sessionCount: number;
  lastSeenAt: string;
};

export type AiCodingDashboardDetailsResult = {
  modelUsage: AiCodingAttributeUsageItem[];
  dailyModelUsage: DailyModelUsageItem[];
  memberUsage: AiCodingMemberUsageItem[];
};

// トレース履歴一覧の1件
export type AiCodingTraceListItem = {
  id: string;
  tool: string;
  metricName: string;
  value: number;
  startedAt: string;
  hasAttributes: boolean;
  sampleCount: number;
};

// トレース履歴一覧取得の結果
export type ListTracesResult = {
  items: AiCodingTraceListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export type ListMetricLogsResult = ListTracesResult;

// ツール設定適用の入力
export type ApplyToolSettingsInput = {
  tool: ConfigurableAiCodingTool;
};

// ツール設定適用の結果
export type ApplyToolSettingsResult = {
  success: boolean;
  configPath: string | null;
  errorCode?:
    | "UNSUPPORTED_PLATFORM"
    | "INVALID_PORT"
    | "PARSE_FAILED"
    | "WRITE_FAILED"
    | "UNKNOWN";
};

// ツール設定取得の結果
export type GetToolSettingsResult = {
  tool: ConfigurableAiCodingTool;
  enabled: boolean;
  appliedAt?: string;
  appliedPort?: number;
};

export type ReceiverStatus = {
  port: number;
  listening: boolean;
  mode: "gui" | "analytics" | "stopped";
};

// メトリクスの記録
export type MetricRecord = {
  tool: string;
  metricName: string;
  value: number;
  attributes?: string;
};

// トレースの記録
export type TraceRecord = {
  tool: string;
  traceId: string;
  spanName: string;
  durationMs: number;
  attributes?: string;
};
