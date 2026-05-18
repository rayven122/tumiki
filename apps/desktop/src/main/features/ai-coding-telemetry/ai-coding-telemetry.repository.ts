import { Prisma } from "@prisma/desktop-client";
import type { DbClient } from "../../shared/db";
import type {
  AiCodingAttributeUsageItem,
  AiCodingMetricCategory,
  AiCodingMemberUsageItem,
  DailyModelUsageItem,
  DailyUsageItem,
  ListTracesInput,
  MetricRecord,
  TelemetrySummaryItem,
  TraceRecord,
} from "./ai-coding-telemetry.types";

type TraceQueryParams = {
  skip: number;
  take: number;
  toolFilter?: string;
  categoryFilter?: AiCodingMetricCategory;
  metricSearch?: string;
  dateFrom?: string;
  dateTo?: string;
};

type AiCodingLogRecord = {
  id: string;
  tool: string;
  metricName: string;
  value: number;
  startedAt: Date;
  hasAttributes: boolean;
  sampleCount: number;
};

const buildMetricWhereClause = (
  params: Omit<TraceQueryParams, "skip" | "take">,
) => {
  const where: Prisma.AiCodingMetricWhereInput = {};

  if (params.toolFilter) {
    where.tool = params.toolFilter;
  }

  if (params.metricSearch) {
    where.metricName = { contains: params.metricSearch };
  }

  const categoryTerms = getMetricCategoryTerms(params.categoryFilter);
  if (categoryTerms.length > 0) {
    const categoryWhere = categoryTerms.map((term) => ({
      metricName: { contains: term },
    }));
    if (params.categoryFilter === "other") {
      where.NOT = { OR: categoryWhere };
    } else {
      where.OR = categoryWhere;
    }
  }

  if (params.dateFrom || params.dateTo) {
    where.recordedAt = {};
    if (params.dateFrom) {
      where.recordedAt.gte = new Date(`${params.dateFrom}T00:00:00`);
    }
    if (params.dateTo) {
      where.recordedAt.lte = new Date(`${params.dateTo}T23:59:59.999`);
    }
  }

  return where;
};

const getMetricCategoryTerms = (
  category: AiCodingMetricCategory | undefined,
): string[] => {
  switch (category) {
    case "tokens":
      return ["token"];
    case "cost":
      return ["cost"];
    case "active_time":
      return ["active_time", "duration"];
    case "session":
      return ["session"];
    case "tool_call":
      return ["tool.call", "tool_use", "unified_exec"];
    case "api":
      return ["api", "websocket", "request", "response"];
    case "other":
      return [
        "token",
        "cost",
        "active_time",
        "duration",
        "session",
        "tool.call",
        "tool_use",
        "unified_exec",
        "api",
        "websocket",
        "request",
        "response",
      ];
    default:
      return [];
  }
};

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

// AIコーディングメトリクスを操作履歴向けに時系列で取得する
export const listTraces = async (
  db: DbClient,
  params: TraceQueryParams,
): Promise<AiCodingLogRecord[]> => {
  const metrics = await db.aiCodingMetric.groupBy({
    by: ["recordedAt", "tool", "metricName"],
    where: buildMetricWhereClause(params),
    orderBy: [{ recordedAt: "desc" }, { tool: "asc" }, { metricName: "asc" }],
    skip: params.skip,
    take: params.take,
    _sum: { value: true },
    _count: { _all: true, attributes: true },
  });

  return metrics.map((metric) => ({
    id: `${metric.recordedAt.getTime()}:${metric.tool}:${metric.metricName}`,
    tool: metric.tool,
    metricName: metric.metricName,
    value: metric._sum.value ?? 0,
    startedAt: metric.recordedAt,
    hasAttributes: metric._count.attributes > 0,
    sampleCount: metric._count._all,
  }));
};

// AIコーディングメトリクスの総件数を取得する
export const countTraces = async (
  db: DbClient,
  params: Omit<ListTracesInput, "page" | "perPage" | "toolFilter"> & {
    toolFilter?: string;
  },
): Promise<number> => {
  const groups = await db.aiCodingMetric.groupBy({
    by: ["recordedAt", "tool", "metricName"],
    where: buildMetricWhereClause(params),
    _count: { _all: true },
  });
  return groups.length;
};

// DBに存在するAIコーディングメトリクスのツール一覧を、件数の多い順で返す
export const listMetricTools = async (db: DbClient): Promise<string[]> => {
  const rows = await db.aiCodingMetric.groupBy({
    by: ["tool"],
    _count: { tool: true },
  });
  return rows
    .map((row) => ({
      tool: row.tool,
      count: row._count.tool,
    }))
    .sort((a, b) => b.count - a.count || a.tool.localeCompare(b.tool))
    .map((row) => row.tool);
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
  interval: "day" | "hour" = "day",
): Promise<DailyUsageItem[]> => {
  // Prisma は SQLite の DateTime をミリ秒 Unix タイムスタンプとして保存するため
  // strftime では unixepoch 変換（÷1000）と localtime 補正を使い、
  // WHERE 句では BigInt で比較する
  const sinceMs = BigInt(since.getTime());
  const dateExpression =
    interval === "hour"
      ? `strftime('%Y-%m-%d %H:00', "recordedAt" / 1000, 'unixepoch', 'localtime')`
      : `strftime('%Y-%m-%d', "recordedAt" / 1000, 'unixepoch', 'localtime')`;
  const rows = await db.$queryRaw<
    { date: string; tool: string; metricName: string; totalValue: number }[]
  >(Prisma.sql`
    SELECT ${Prisma.raw(dateExpression)} as date,
           "tool", "metricName", SUM("value") as totalValue
    FROM   "AiCodingMetric"
    WHERE  "recordedAt" >= ${sinceMs}
    GROUP  BY date, "tool", "metricName"
    ORDER  BY date ASC
  `);
  return rows.map((r) => ({
    date: r.date,
    tool: r.tool,
    metricName: r.metricName,
    totalValue: toFiniteNumber(r.totalValue),
  }));
};

// model などの属性値別に利用量を集計する
export const getModelUsage = async (
  db: DbClient,
  since: Date,
): Promise<AiCodingAttributeUsageItem[]> => {
  const sinceMs = BigInt(since.getTime());
  const rows = await db.$queryRaw<
    {
      tool: string;
      attributeValue: string | null;
      totalValue: number;
      sampleCount: number;
    }[]
  >`
    SELECT m."tool" as tool,
           json_extract(j.value, '$.value.stringValue') as attributeValue,
           SUM(m."value") as totalValue,
           COUNT(*) as sampleCount
    FROM   "AiCodingMetric" m,
           json_each(m."attributes") j
    WHERE  m."recordedAt" >= ${sinceMs}
       AND json_extract(j.value, '$.key') = 'model'
       AND json_extract(j.value, '$.value.stringValue') IS NOT NULL
    GROUP  BY m."tool", attributeValue
    ORDER  BY sampleCount DESC
    LIMIT  12
  `;
  return rows
    .filter((row) => row.attributeValue)
    .map((row) => ({
      tool: row.tool,
      attributeValue: row.attributeValue ?? "unknown",
      totalValue: toFiniteNumber(row.totalValue),
      sampleCount: toFiniteNumber(row.sampleCount),
    }));
};

// model 属性を持つメトリクスを日別/時間別に集計する
export const getDailyModelUsage = async (
  db: DbClient,
  since: Date,
  interval: "day" | "hour" = "day",
): Promise<DailyModelUsageItem[]> => {
  const sinceMs = BigInt(since.getTime());
  const dateExpression =
    interval === "hour"
      ? `strftime('%Y-%m-%d %H:00', m."recordedAt" / 1000, 'unixepoch', 'localtime')`
      : `strftime('%Y-%m-%d', m."recordedAt" / 1000, 'unixepoch', 'localtime')`;
  const rows = await db.$queryRaw<
    {
      date: string;
      tool: string;
      model: string | null;
      sampleCount: number;
      totalValue: number;
    }[]
  >(Prisma.sql`
    SELECT ${Prisma.raw(dateExpression)} as date,
           m."tool" as tool,
           json_extract(j.value, '$.value.stringValue') as model,
           COUNT(*) as sampleCount,
           SUM(m."value") as totalValue
    FROM   "AiCodingMetric" m,
           json_each(m."attributes") j
    WHERE  m."recordedAt" >= ${sinceMs}
       AND json_extract(j.value, '$.key') = 'model'
       AND json_extract(j.value, '$.value.stringValue') IS NOT NULL
    GROUP  BY date, m."tool", model
    ORDER  BY date ASC
  `);
  return rows
    .filter((row) => row.model)
    .map((row) => ({
      date: row.date,
      tool: row.tool,
      model: row.model ?? "unknown",
      sampleCount: toFiniteNumber(row.sampleCount),
      totalValue: toFiniteNumber(row.totalValue),
    }));
};

// user.email / user.name をもとにメンバー別の主要指標を集計する
export const getMemberUsage = async (
  db: DbClient,
  since: Date,
): Promise<AiCodingMemberUsageItem[]> => {
  const sinceMs = BigInt(since.getTime());
  const rows = await db.$queryRaw<
    {
      member: string;
      tool: string;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      sessionCount: number;
      lastSeenAt: bigint | number | string;
    }[]
  >`
    WITH metric_attrs AS (
      SELECT m."id",
             m."tool",
             m."metricName",
             m."value",
             m."recordedAt",
             MAX(CASE
               WHEN json_extract(j.value, '$.key') = 'user.email'
               THEN json_extract(j.value, '$.value.stringValue')
             END) as user_email,
             MAX(CASE
               WHEN json_extract(j.value, '$.key') = 'user.name'
               THEN json_extract(j.value, '$.value.stringValue')
             END) as user_name,
             MAX(CASE
               WHEN json_extract(j.value, '$.key') = 'type'
               THEN json_extract(j.value, '$.value.stringValue')
             END) as token_type
      FROM   "AiCodingMetric" m
      LEFT JOIN json_each(m."attributes") j
      WHERE  m."recordedAt" >= ${sinceMs}
      GROUP  BY m."id"
    )
    SELECT COALESCE(user_email, user_name, 'ユーザー情報なし') as member,
           "tool" as tool,
           SUM(CASE
             WHEN "metricName" LIKE '%token%' AND token_type = 'input'
             THEN "value" ELSE 0
           END) as inputTokens,
           SUM(CASE
             WHEN "metricName" LIKE '%token%' AND token_type = 'output'
             THEN "value" ELSE 0
           END) as outputTokens,
           SUM(CASE
             WHEN "metricName" LIKE '%cost%'
             THEN "value" ELSE 0
           END) as costUsd,
           SUM(CASE
             WHEN "metricName" LIKE '%session%' OR "metricName" LIKE '%thread.started%'
             THEN "value" ELSE 0
           END) as sessionCount,
           MAX("recordedAt") as lastSeenAt
    FROM   metric_attrs
    GROUP  BY member, "tool"
    HAVING inputTokens > 0 OR outputTokens > 0 OR costUsd > 0 OR sessionCount > 0
    ORDER  BY costUsd DESC, (inputTokens + outputTokens) DESC
    LIMIT  10
  `;
  return rows.map((row) => ({
    member: row.member,
    tool: row.tool,
    inputTokens: toFiniteNumber(row.inputTokens),
    outputTokens: toFiniteNumber(row.outputTokens),
    costUsd: toFiniteNumber(row.costUsd),
    sessionCount: toFiniteNumber(row.sessionCount),
    lastSeenAt: new Date(Number(row.lastSeenAt)).toISOString(),
  }));
};
