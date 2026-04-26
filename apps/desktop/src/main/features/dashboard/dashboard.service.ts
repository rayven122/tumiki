import { getDb } from "../../shared/db";
import * as repository from "./dashboard.repository";
import type {
  DashboardAiClient,
  DashboardConnectorCard,
  DashboardConnectorSeries,
  DashboardConnectorStatus,
  DashboardInput,
  DashboardLogItem,
  DashboardPeriod,
  DashboardResult,
  DashboardTimePoint,
} from "./dashboard.types";
import type { AuditLogSlim, ConnectorWithMeta } from "./dashboard.repository";
import type { ServerStatus } from "@prisma/desktop-client";

/** 期間ごとのバケット定義 */
const PERIOD_DEFINITIONS: Record<
  DashboardPeriod,
  { spanMs: number; bucketCount: number; bucketUnit: "hour" | "day" }
> = {
  "24h": { spanMs: 24 * 60 * 60 * 1000, bucketCount: 24, bucketUnit: "hour" },
  "7d": { spanMs: 7 * 24 * 60 * 60 * 1000, bucketCount: 7, bucketUnit: "day" },
  "30d": {
    spanMs: 30 * 24 * 60 * 60 * 1000,
    bucketCount: 30,
    bucketUnit: "day",
  },
};

/** 系列色の固定パレット（凡例の上位順に割り当て） */
const SERIES_PALETTE = [
  "#E01E5A",
  "#A259FF",
  "#10a37f",
  "#8b949e",
  "#DA704E",
  "#362D59",
];

/** チャート系列の最大数 */
const TOP_N_CONNECTIONS = 5;

/** AIクライアント円グラフの最大件数 */
const TOP_N_AI_CLIENTS = 5;

/** ダッシュボード下部の直近ログ件数 */
const RECENT_LOGS_LIMIT = 6;

/** 接続名が未設定の場合のフォールバック */
const UNKNOWN_CONNECTION_LABEL = "未指定";

/** 小数1位までの丸め */
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** 系列キーに使用する slug 化（衝突回避でindexを前置） */
const buildSeriesKey = (label: string, index: number): string => {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `s${index}_${slug || "unknown"}`;
};

/** バケット境界用に時刻を切り捨て（時間単位 or 日単位、ローカルタイム） */
const floorToBucket = (date: Date, unit: "hour" | "day"): Date => {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  if (unit === "day") d.setHours(0);
  return d;
};

/** バケット境界用に時刻を切り上げ（既に境界上ならそのまま） */
const ceilToBucket = (date: Date, unit: "hour" | "day"): Date => {
  const floored = floorToBucket(date, unit);
  if (floored.getTime() === date.getTime()) return floored;
  const d = new Date(floored);
  if (unit === "hour") {
    d.setHours(d.getHours() + 1);
  } else {
    d.setDate(d.getDate() + 1);
  }
  return d;
};

/** バケット境界 → X軸ラベル */
const formatBucketLabel = (date: Date, period: DashboardPeriod): string => {
  const pad2 = (n: number): string => String(n).padStart(2, "0");
  if (period === "24h") return `${pad2(date.getHours())}:00`;
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};

/** ServerStatus → コネクタカード表示用ステータス */
const toCardStatus = (status: ServerStatus): DashboardConnectorStatus => {
  if (status === "RUNNING") return "active";
  if (status === "ERROR") return "degraded";
  return "inactive";
};

/** AuditLog レコードを IPC 通信用の型へ変換 */
const toLogItem = (record: AuditLogSlim): DashboardLogItem => ({
  id: record.id,
  createdAt: record.createdAt.toISOString(),
  connectionName: record.connectionName,
  toolName: record.toolName,
  clientName: record.clientName,
  isSuccess: record.isSuccess,
  durationMs: record.durationMs,
});

/** 接続別の集計から上位N件を抽出して凡例系列を構築 */
const buildSeries = (logs: AuditLogSlim[]): DashboardConnectorSeries[] => {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const name = log.connectionName ?? UNKNOWN_CONNECTION_LABEL;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_N_CONNECTIONS)
    .map(([label], i) => ({
      key: buildSeriesKey(label, i),
      label,
      color: SERIES_PALETTE[i % SERIES_PALETTE.length] ?? "#8b949e",
    }));
};

/** 期間内ログを系列別×バケットで集計してタイムラインを生成 */
const buildTimeline = (
  logs: AuditLogSlim[],
  series: DashboardConnectorSeries[],
  range: { from: Date; to: Date },
  period: DashboardPeriod,
): DashboardTimePoint[] => {
  const def = PERIOD_DEFINITIONS[period];
  const bucketSpanMs = def.spanMs / def.bucketCount;
  // 終端を bucketUnit 境界に切り上げて、そこから過去方向に bucketCount 個並べる
  // （floor(range.from) を起点にすると現在進行中の最終バケットが範囲外に落ちるため）
  const end = ceilToBucket(range.to, def.bucketUnit);
  const start = new Date(end.getTime() - def.spanMs);
  const labelToKey = new Map(series.map((s) => [s.label, s.key]));

  const timeline: DashboardTimePoint[] = [];
  for (let i = 0; i < def.bucketCount; i++) {
    const bucketStart = new Date(start.getTime() + i * bucketSpanMs);
    const values: Record<string, number> = {};
    for (const s of series) values[s.key] = 0;
    timeline.push({ label: formatBucketLabel(bucketStart, period), values });
  }

  for (const log of logs) {
    const offset = log.createdAt.getTime() - start.getTime();
    if (offset < 0) continue;
    const idx = Math.floor(offset / bucketSpanMs);
    const bucket = timeline[idx];
    if (!bucket) continue;
    const label = log.connectionName ?? UNKNOWN_CONNECTION_LABEL;
    const key = labelToKey.get(label);
    if (!key) continue;
    bucket.values[key] = (bucket.values[key] ?? 0) + 1;
  }

  return timeline;
};

/** AIクライアント別の構成比（上位N件） */
const buildAiClients = (logs: AuditLogSlim[]): DashboardAiClient[] => {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (!log.clientName) continue;
    counts.set(log.clientName, (counts.get(log.clientName) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_N_AI_CLIENTS)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? round1((count / total) * 100) : 0,
    }));
};

/** コネクタカードの組み立て */
const buildConnectorCards = (
  connectors: ConnectorWithMeta[],
): DashboardConnectorCard[] =>
  connectors.map((c) => ({
    serverId: c.serverId,
    connectionId: c.connectionId,
    name: c.name,
    iconPath: c.iconPath,
    status: toCardStatus(c.serverStatus),
  }));

/**
 * ダッシュボード集計データを取得
 */
export const getDashboard = async (
  input: DashboardInput,
): Promise<DashboardResult> => {
  const db = await getDb();
  const def = PERIOD_DEFINITIONS[input.period];
  const now = new Date();
  const currentRange = { from: new Date(now.getTime() - def.spanMs), to: now };
  const previousRange = {
    from: new Date(currentRange.from.getTime() - def.spanMs),
    to: currentRange.from,
  };

  const [logs, prevCounts, recentLogs, connectors] = await Promise.all([
    repository.findAuditLogsInRange(db, currentRange),
    repository.countAuditLogsInRange(db, previousRange),
    repository.findRecentAuditLogs(db, RECENT_LOGS_LIMIT),
    repository.findAllConnectors(db),
  ]);

  const total = logs.length;
  const success = logs.reduce((acc, l) => acc + (l.isSuccess ? 1 : 0), 0);
  const blocks = total - success;
  const successRate = total > 0 ? round1((success / total) * 100) : 0;
  const blockRate = total > 0 ? round1((blocks / total) * 100) : 0;
  const prevSuccessRate =
    prevCounts.total > 0
      ? round1((prevCounts.success / prevCounts.total) * 100)
      : 0;

  const series = buildSeries(logs);
  const timeline = buildTimeline(logs, series, currentRange, input.period);
  const aiClients = buildAiClients(logs);
  const connectorCards = buildConnectorCards(connectors);
  const connectorsDegraded = connectors.filter(
    (c) => c.serverStatus !== "RUNNING",
  ).length;

  return {
    period: input.period,
    kpi: {
      requests: total,
      requestsDelta: total - prevCounts.total,
      blocks,
      blockRate,
      successRate,
      successRateDelta: round1(successRate - prevSuccessRate),
      connectors: connectors.length,
      connectorsDegraded,
    },
    series,
    timeline,
    aiClients,
    connectors: connectorCards,
    recentLogs: recentLogs.map(toLogItem),
  };
};
