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

// ダッシュボード統計のレスポンススキーマ
export const DashboardStatsSchema = z.object({
  // エージェント統計
  runningAgentCount: z.number(),
  todayExecutionCount: z.number(),
  todaySuccessCount: z.number(),
  todayErrorCount: z.number(),
  // MCP統計
  mcpServerCount: z.number(),
  todayMcpRequestCount: z.number(),
  last24hMcpRequestCount: z.number(),
  mcpErrorRate: z.number(),
  // 組織統計
  agentCount: z.number(),
  scheduleCount: z.number(),
  // 今月のコスト（将来対応、現在は未実装）
  monthlyEstimatedCost: z.number().nullable(),
  // 次の実行予定
  nextSchedule: NextScheduleSchema,
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

// グラフデータスキーマ
export const ChartDataSchema = z.object({
  data: z.array(ChartDataPointSchema),
  total: z.number(),
  successTotal: z.number(),
  errorTotal: z.number(),
});
