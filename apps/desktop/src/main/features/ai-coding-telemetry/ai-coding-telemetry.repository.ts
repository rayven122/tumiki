import type { DbClient } from "../../shared/db";
import type {
  DailyUsageItem,
  MetricRecord,
  TelemetrySummaryItem,
  TraceRecord,
} from "./ai-coding-telemetry.types";

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

// メトリクスを一括保存する
export const storeMetrics = async (
  db: DbClient,
  metrics: MetricRecord[],
): Promise<void> => {
  if (metrics.length === 0) return;
  await db.aiCodingMetric.createMany({ data: metrics });
};

// トレースを一括保存する
export const storeTraces = async (
  db: DbClient,
  traces: TraceRecord[],
): Promise<void> => {
  if (traces.length === 0) return;
  await db.aiCodingTrace.createMany({ data: traces });
};

// 指定日時より古いメトリクスを削除し、削除件数を返す
export const deleteOldMetrics = async (
  db: DbClient,
  before: Date,
): Promise<number> => {
  const result = await db.aiCodingMetric.deleteMany({
    where: { recordedAt: { lt: before } },
  });
  return result.count;
};

// 指定日時より古いトレースを削除し、削除件数を返す
export const deleteOldTraces = async (
  db: DbClient,
  before: Date,
): Promise<number> => {
  const result = await db.aiCodingTrace.deleteMany({
    where: { startedAt: { lt: before } },
  });
  return result.count;
};

// 指定期間のメトリクスをツール・メトリクス名ごとに集計して返す
export const getSummary = async (
  db: DbClient,
  since: Date,
): Promise<TelemetrySummaryItem[]> => {
  const rows = await db.aiCodingMetric.groupBy({
    by: ["tool", "metricName"],
    where: { recordedAt: { gte: since } },
    _sum: { value: true },
  });
  return rows.map((r) => ({
    tool: r.tool,
    metricName: r.metricName,
    totalValue: r._sum.value ?? 0,
  }));
};

// 指定期間の日別・ツール別・メトリクス名別の集計を返す
// SQLite の strftime を使うため $queryRaw を利用する
export const getDailyUsage = async (
  db: DbClient,
  since: Date,
): Promise<DailyUsageItem[]> => {
  // Prisma は SQLite の DateTime をミリ秒 Unix タイムスタンプとして保存するため
  // strftime では unixepoch 変換（÷1000）と localtime 補正を使い、
  // WHERE 句では BigInt で比較する
  const sinceMs = BigInt(since.getTime());
  const rows = await db.$queryRaw<
    { date: string; tool: string; metricName: string; totalValue: number }[]
  >`
    SELECT strftime('%Y-%m-%d', "recordedAt" / 1000, 'unixepoch', 'localtime') as date,
           "tool", "metricName", SUM("value") as totalValue
    FROM   "AiCodingMetric"
    WHERE  "recordedAt" >= ${sinceMs}
    GROUP  BY date, "tool", "metricName"
    ORDER  BY date ASC
  `;
  return rows.map((r) => ({
    date: r.date,
    tool: r.tool,
    metricName: r.metricName,
    totalValue: toFiniteNumber(r.totalValue),
  }));
};
