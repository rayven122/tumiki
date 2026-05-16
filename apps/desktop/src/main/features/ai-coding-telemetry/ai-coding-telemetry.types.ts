// AI コーディングツールの種類
export type AiCodingTool = "claude-code" | "codex";

// AI コーディングツールの正規値一覧（外部入力の検証に利用）
export const AI_CODING_TOOLS: readonly AiCodingTool[] = [
  "claude-code",
  "codex",
] as const;

// 文字列が正規の AiCodingTool か判定するタイプガード
export const isAiCodingTool = (value: string): value is AiCodingTool =>
  (AI_CODING_TOOLS as readonly string[]).includes(value);

// サマリー取得の入力
export type GetSummaryInput = { days: number };

// 日別使用量取得の入力
export type GetDailyUsageInput = { days: number };

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

// ツール設定適用の入力
export type ApplyToolSettingsInput = {
  tool: AiCodingTool;
};

// ツール設定適用の結果
export type ApplyToolSettingsResult = {
  success: boolean;
  configPath: string | null;
  errorCode?:
    | "UNSUPPORTED_PLATFORM"
    | "INVALID_PORT"
    | "WRITE_FAILED"
    | "UNKNOWN";
};

// ツール設定取得の結果
export type GetToolSettingsResult = {
  tool: AiCodingTool;
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
