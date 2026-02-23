import { z } from "zod";

// 次の実行予定スキーマ
export const NextScheduleSchema = z
  .object({
    agentName: z.string(),
    agentSlug: z.string(),
    scheduleName: z.string(),
    cronExpression: z.string(),
    nextRunAt: z.date(),
    minutesUntilNextRun: z.number(),
  })
  .nullable();

export type NextSchedule = z.infer<typeof NextScheduleSchema>;

// ダッシュボード統計のレスポンススキーマ
export const DashboardStatsSchema = z.object({
  // エージェント統計
  runningAgentCount: z.number(),
  todayExecutionCount: z.number(),
  todaySuccessCount: z.number(),
  todayErrorCount: z.number(),
  // 前日比用
  yesterdayExecutionCount: z.number(),
  // MCP統計
  mcpServerCount: z.number(),
  todayMcpRequestCount: z.number(),
  last24hMcpRequestCount: z.number(),
  mcpErrorRate: z.number(),
  // 組織統計
  agentCount: z.number(),
  scheduleCount: z.number(),
  // 今月のコスト推計（トークン使用量ベース）
  monthlyEstimatedCost: z.number().nullable(),
  // 先月のコスト推計
  lastMonthEstimatedCost: z.number().nullable(),
  // 次の実行予定
  nextSchedule: NextScheduleSchema,
});

// MCPサーバーアイコンスキーマ
export const McpServerIconSchema = z.object({
  id: z.string(),
  iconPath: z.string().nullable(),
});

// 最近の実行履歴スキーマ
export const RecentExecutionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  agentIconPath: z.string().nullable(),
  success: z.boolean().nullable(),
  durationMs: z.number().nullable(),
  createdAt: z.date(),
  modelId: z.string().nullable(),
  scheduleName: z.string().nullable(),
  chatId: z.string().nullable(),
  mcpServerIcons: z.array(McpServerIconSchema),
});

// 実行履歴ソートスキーマ
export const RecentExecutionSortKeySchema = z.enum([
  "createdAt",
  "success",
  "durationMs",
]);
export const RecentExecutionSortDirectionSchema = z.enum(["asc", "desc"]);

// ページネーション付き実行履歴スキーマ
export const PaginatedRecentExecutionsSchema = z.object({
  items: z.array(RecentExecutionSchema),
  totalCount: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
});

// 時間範囲スキーマ
export const TimeRangeSchema = z.enum(["24h", "7d", "30d"]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

// グラフデータポイントスキーマ
export const ChartDataPointSchema = z.object({
  label: z.string(),
  count: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
});

export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;

// グラフデータスキーマ
export const ChartDataSchema = z.object({
  data: z.array(ChartDataPointSchema),
  total: z.number(),
  successTotal: z.number(),
  errorTotal: z.number(),
});

export type ChartData = z.infer<typeof ChartDataSchema>;

// エージェント別パフォーマンスのアイテムスキーマ
export const AgentPerformanceItemSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  agentIconPath: z.string().nullable(),
  totalExecutions: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
  successRate: z.number().nullable(), // 0-100, 実行ゼロならnull
  avgDurationMs: z.number().nullable(),
  lastExecutionAt: z.date().nullable(),
  lastExecutionSuccess: z.boolean().nullable(),
});

// エージェント別パフォーマンスのレスポンススキーマ
export const AgentPerformanceSchema = z.object({
  agents: z.array(AgentPerformanceItemSchema),
});

export type AgentPerformance = z.infer<typeof AgentPerformanceSchema>;

// MCPサーバーヘルスアイテムスキーマ
export const McpServerHealthItemSchema = z.object({
  mcpServerId: z.string(),
  name: z.string(),
  slug: z.string(),
  iconPath: z.string().nullable(),
  serverStatus: z.enum(["RUNNING", "STOPPED", "ERROR", "PENDING"]),
  requestCount: z.number(),
  errorCount: z.number(),
  errorRate: z.number(),
  avgDurationMs: z.number().nullable(),
});

// MCPサーバーヘルスレスポンススキーマ
export const McpServerHealthSchema = z.object({
  servers: z.array(McpServerHealthItemSchema),
});

// スケジュールタイムラインアイテムスキーマ
export const ScheduleTimelineItemSchema = z.object({
  scheduleId: z.string(),
  scheduleName: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  agentIconPath: z.string().nullable(),
  cronExpression: z.string(),
  nextRunAt: z.date(),
});

// スケジュールタイムラインレスポンススキーマ
export const ScheduleTimelineSchema = z.object({
  items: z.array(ScheduleTimelineItemSchema),
});

// スケジュールタイムライン範囲スキーマ
export const ScheduleRangeSchema = z.enum(["today", "week"]);
export type ScheduleRange = z.infer<typeof ScheduleRangeSchema>;

// コスト推移データポイントスキーマ
export const CostTrendDataPointSchema = z.object({
  label: z.string(),
  cost: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
});

// コスト推移レスポンススキーマ
export const CostTrendDataSchema = z.object({
  data: z.array(CostTrendDataPointSchema),
  totalCost: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
});

export type CostTrendData = z.infer<typeof CostTrendDataSchema>;

// エージェント別コストアイテムスキーマ
export const AgentCostItemSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  agentIconPath: z.string().nullable(),
  estimatedCost: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  mcpServerCount: z.number(),
});

// エージェント別コスト内訳レスポンススキーマ
export const AgentCostBreakdownSchema = z.object({
  agents: z.array(AgentCostItemSchema),
  totalCost: z.number(),
});

export type AgentCostBreakdown = z.infer<typeof AgentCostBreakdownSchema>;

// PII InfoType別内訳スキーマ
export const PiiInfoTypeBreakdownSchema = z.object({
  infoType: z.string(),
  count: z.number(),
});

// PII統計スキーマ
export const PiiStatsSchema = z.object({
  // 総検知数（リクエスト + レスポンス）
  totalDetections: z.number(),
  // リクエスト側の検知数
  requestDetections: z.number(),
  // レスポンス側の検知数
  responseDetections: z.number(),
  // マスキング有効なリクエスト数
  maskedRequestCount: z.number(),
  // InfoType別内訳
  infoTypeBreakdown: z.array(PiiInfoTypeBreakdownSchema),
  // トレンドデータ
  trendData: ChartDataSchema,
});
