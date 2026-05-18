import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity, ArrowRight, Bot, Megaphone } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { ANNOUNCEMENTS } from "../data/mock";
import { DEFAULT_KPI, PERIODS, type Period } from "../data/dashboard-data";
import { useDashboard } from "../hooks/useDashboard";
import {
  useAiCodingTelemetryUsage,
  useAiCodingToolSettings,
} from "../hooks/useAiCodingTelemetry";
import { getClientLogo } from "../utils/ai-client-logo";
import { statusBadge, isErrorRow } from "../utils/theme-styles";
import { TRACKING_TOOL_LABELS } from "../utils/ai-coding-telemetry-tools";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DashboardAiClient,
  DashboardConnectorCard,
  DashboardConnectorSeries,
  DashboardKpi,
  DashboardLogItem,
  DashboardTimePoint,
} from "../../main/types";
import type {
  AiCodingAttributeUsageItem,
  AiCodingMemberUsageItem,
  ConfigurableAiCodingTool,
  DailyModelUsageItem,
  TelemetrySummaryItem,
} from "../../main/types";

/** AIクライアント円グラフの色パレット */
const AI_PIE_PALETTE = ["#fff", "#10a37f", "#DA704E", "#A259FF", "#8b949e"];

/** 期間ごとの前期比ラベル */
const PERIOD_DELTA_LABEL: Record<Period, string> = {
  "24h": "前日比",
  "7d": "前週比",
  "30d": "前月比",
};

const PERIOD_TO_TELEMETRY_DAYS: Record<Period, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

const AI_CODING_TOOLS: readonly ConfigurableAiCodingTool[] = [
  "claude-code",
  "codex",
];

const AI_TOOL_CHART_COLORS = [
  "#10a37f",
  "#DA704E",
  "#A259FF",
  "#3b82f6",
  "#f59e0b",
  "#8b949e",
];

const GPT_MODEL_COLORS = ["#10a37f", "#3b82f6", "#14b8a6", "#22c55e"];
const CLAUDE_MODEL_COLORS = ["#DA704E", "#A259FF", "#f59e0b", "#ef4444"];

const getModelFamily = (modelName: string): "gpt" | "claude" | "other" => {
  const normalized = modelName.toLowerCase();
  if (normalized.includes("gpt")) return "gpt";
  if (normalized.includes("claude")) return "claude";
  return "other";
};

const buildModelColorMap = (modelNames: string[]): Map<string, string> => {
  const familyCounts = {
    gpt: 0,
    claude: 0,
    other: 0,
  };
  return new Map(
    modelNames.map((modelName) => {
      const family = getModelFamily(modelName);
      const index = familyCounts[family];
      familyCounts[family] += 1;
      const palette =
        family === "gpt"
          ? GPT_MODEL_COLORS
          : family === "claude"
            ? CLAUDE_MODEL_COLORS
            : AI_TOOL_CHART_COLORS;
      return [modelName, palette[index % palette.length] ?? "#8b949e"];
    }),
  );
};

/** 符号付きの差分整数表示（パーセント表示と揃えて0は ±0 を返す） */
const formatSignedInt = (value: number): string => {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return `±${value}`;
};

/** 符号付きの差分パーセント表示（小数1位） */
const formatSignedPercent = (value: number): string => {
  const sign = value > 0 ? "+" : value < 0 ? "" : "±";
  return `${sign}${value.toFixed(1)}%`;
};

/** AuditLogの成功/失敗 → ステータスバッジキー */
const toStatusKey = (item: DashboardLogItem): string =>
  item.isSuccess ? "success" : "error";

/* ===== チャートツールチップ ===== */

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}): JSX.Element | null => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-white/[.08] dark:bg-zinc-900">
      <p className="mb-1 text-gray-500 dark:text-zinc-500">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-900 dark:text-white">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ===== コネクタアイコン ===== */

const ConnectorIcon = ({
  name,
  iconPath,
}: {
  name: string;
  iconPath: string | null;
}): JSX.Element => {
  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={name}
        className="h-5 w-5 shrink-0 rounded object-contain"
      />
    );
  }
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-black/[.02] text-[10px] font-semibold text-gray-600 dark:bg-white/[.04] dark:text-zinc-400">
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
};

/* ===== KPI ===== */

const buildKpiCards = (kpi: DashboardKpi, period: Period) => {
  const deltaLabel = PERIOD_DELTA_LABEL[period];
  return [
    {
      label: `リクエスト / ${period}`,
      value: kpi.requests.toLocaleString(),
      sub: `${formatSignedInt(kpi.requestsDelta)} ${deltaLabel}`,
      colorClass: "text-gray-900 dark:text-white",
    },
    {
      label: "成功率",
      value: `${kpi.successRate.toFixed(1)}%`,
      sub: `${deltaLabel} ${formatSignedPercent(kpi.successRateDelta)}`,
      colorClass: "text-emerald-600 dark:text-emerald-400",
    },
  ];
};

/* ===== AIクライアントセクション ===== */

const AiClientsSection = ({
  aiClients,
  activeAi,
  onToggleAi,
  resolveColor,
}: {
  aiClients: DashboardAiClient[];
  activeAi: string | null;
  onToggleAi: (name: string) => void;
  resolveColor: (color: string) => string;
}): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const pieData = aiClients.map((c, i) => ({
    name: c.name,
    value: c.percentage,
    color: AI_PIE_PALETTE[i % AI_PIE_PALETTE.length] ?? "#8b949e",
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[.08] dark:bg-zinc-900">
      <span className="mb-3 block text-sm font-medium text-gray-600 dark:text-zinc-400">
        AIクライアント別
      </span>
      {aiClients.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-500 dark:text-zinc-500">
          まだ利用ログがありません
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={46}
                  dataKey="value"
                  stroke="none"
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={resolveColor(entry.color)}
                      opacity={
                        activeAi === null || activeAi === entry.name ? 1 : 0.2
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: resolveColor(item.color) }}
                />
                <span className="truncate text-gray-600 dark:text-zinc-400">
                  {item.name}
                </span>
                <span className="ml-auto font-mono text-gray-400 dark:text-zinc-600">
                  {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-t-gray-200 pt-2 dark:border-t-white/[.08]">
              {aiClients.map((ai) => {
                const isActive = activeAi === null || activeAi === ai.name;
                const logo = getClientLogo(ai.name);
                return (
                  <button
                    key={ai.name}
                    type="button"
                    onClick={() => onToggleAi(ai.name)}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-gray-600 transition-colors dark:text-zinc-400 ${
                      isActive
                        ? "bg-black/[.06] opacity-100 dark:bg-white/[.08]"
                        : "bg-black/[.02] opacity-50 dark:bg-white/[.04]"
                    }`}
                  >
                    {logo ? (
                      <img
                        src={theme === "dark" ? logo.dark : logo.light}
                        alt={ai.name}
                        className="h-3.5 w-3.5 rounded"
                      />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500" />
                    )}
                    <span className="text-[10px]">{ai.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AiToolStatusPill = ({
  tool,
}: {
  tool: ConfigurableAiCodingTool;
}): JSX.Element => {
  const { settings, isLoading } = useAiCodingToolSettings(tool);
  const enabled = settings?.enabled === true;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        enabled
          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
          : "bg-gray-100 text-gray-500 dark:bg-white/[.06] dark:text-zinc-500"
      }`}
    >
      {TRACKING_TOOL_LABELS[tool]}{" "}
      {isLoading ? "確認中" : enabled ? "記録中" : "停止"}
    </span>
  );
};

const formatCompactNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
};

const formatCurrency = (value: number): string =>
  `$${value.toFixed(value < 1 ? 4 : 2)}`;

const isTokenMetric = (metricName: string): boolean =>
  metricName.toLowerCase().includes("token");

const isCostMetric = (metricName: string): boolean =>
  metricName.toLowerCase().includes("cost");

const sumSummary = (
  summary: TelemetrySummaryItem[],
  predicate: (metricName: string) => boolean,
): number =>
  summary
    .filter((item) => predicate(item.metricName))
    .reduce((sum, item) => sum + item.totalValue, 0);

const buildAiKpiCards = (
  memberUsage: AiCodingMemberUsageItem[],
  summary: TelemetrySummaryItem[],
  period: Period,
) => {
  const inputTokens = memberUsage.reduce(
    (sum, item) => sum + item.inputTokens,
    0,
  );
  const outputTokens = memberUsage.reduce(
    (sum, item) => sum + item.outputTokens,
    0,
  );
  const totalTokens = sumSummary(summary, isTokenMetric);
  const costTotal =
    memberUsage.reduce((sum, item) => sum + item.costUsd, 0) ||
    sumSummary(summary, isCostMetric);

  return [
    {
      label: `入出力トークン / ${period}`,
      value: formatCompactNumber((inputTokens || totalTokens) + outputTokens),
      sub: `入力 ${formatCompactNumber(inputTokens || totalTokens)} / 出力 ${formatCompactNumber(outputTokens)}`,
      colorClass: "text-sky-600 dark:text-sky-400",
    },
    {
      label: `推定コスト / ${period}`,
      value: formatCurrency(costTotal),
      sub: "USD",
      colorClass: "text-violet-600 dark:text-violet-400",
    },
  ];
};

const buildDailyModelRows = (
  dailyModelUsage: DailyModelUsageItem[],
  period: Period,
): { rows: Array<Record<string, string | number>>; modelLabels: string[] } => {
  const rows = new Map<string, Record<string, string | number>>();
  const totals = new Map<string, number>();
  const isHourly = period === "24h";

  for (const item of dailyModelUsage) {
    const modelLabel = item.model;
    totals.set(modelLabel, (totals.get(modelLabel) ?? 0) + item.sampleCount);
    const rowLabel = item.date.includes(" ")
      ? item.date.slice(11)
      : item.date.slice(5);
    const row = rows.get(item.date) ?? { date: rowLabel };
    row[modelLabel] = Number(row[modelLabel] ?? 0) + item.sampleCount;
    rows.set(item.date, row);
  }

  const modelLabels = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)
    .slice(0, 6);

  if (isHourly) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    for (let index = 23; index >= 0; index -= 1) {
      const bucket = new Date(now.getTime() - index * 3600_000);
      const key = `${bucket.getFullYear()}-${String(bucket.getMonth() + 1).padStart(2, "0")}-${String(bucket.getDate()).padStart(2, "0")} ${String(bucket.getHours()).padStart(2, "0")}:00`;
      rows.set(
        key,
        rows.get(key) ?? {
          date: `${String(bucket.getHours()).padStart(2, "0")}:00`,
        },
      );
    }
  }

  for (const row of rows.values()) {
    for (const modelLabel of modelLabels) row[modelLabel] ??= 0;
  }

  return {
    rows: [...rows.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row),
    modelLabels,
  };
};

const buildModelRows = (
  modelUsage: Array<{
    attributeValue: string;
    sampleCount: number;
  }>,
): Array<{ name: string; value: number }> => {
  const totals = new Map<string, number>();
  for (const item of modelUsage) {
    totals.set(
      item.attributeValue,
      (totals.get(item.attributeValue) ?? 0) + item.sampleCount,
    );
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
};

const AiCodingAnalyticsSection = ({
  period,
  resolveColor,
  summary,
  dailyModelUsage,
  modelUsage,
  isLoading,
}: {
  period: Period;
  resolveColor: (color: string) => string;
  summary: TelemetrySummaryItem[];
  dailyModelUsage: DailyModelUsageItem[];
  modelUsage: AiCodingAttributeUsageItem[];
  isLoading: boolean;
}): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const hasData = summary.length > 0;
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  const modelTrend = useMemo(
    () => buildDailyModelRows(dailyModelUsage, period),
    [dailyModelUsage, period],
  );
  const modelRows = useMemo(() => buildModelRows(modelUsage), [modelUsage]);
  const modelColorMap = useMemo(() => {
    const labels = [
      ...new Set([
        ...modelTrend.modelLabels,
        ...modelRows.map((row) => row.name),
      ]),
    ];
    return buildModelColorMap(labels);
  }, [modelRows, modelTrend.modelLabels]);
  const getModelColor = (modelName: string): string =>
    resolveColor(modelColorMap.get(modelName) ?? "#8b949e");

  if (!hasData && !isLoading) {
    return <></>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[.08] dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            AI利用分析
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {AI_CODING_TOOLS.map((tool) => (
            <AiToolStatusPill key={tool} tool={tool} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg bg-black/[.02] p-3 dark:bg-white/[.04]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              モデル別推移
            </p>
            <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] text-gray-400 dark:text-zinc-600">
              {modelTrend.modelLabels.map((modelLabel) => (
                <span key={modelLabel} className="flex items-center gap-1">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: getModelColor(modelLabel),
                    }}
                  />
                  <span className="max-w-[150px] truncate">{modelLabel}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="h-[220px]">
            {modelTrend.rows.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-zinc-500">
                モデル別推移はまだありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={modelTrend.rows}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: theme === "dark" ? "#71717a" : "#9ca3af",
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  {modelTrend.modelLabels.map((modelLabel) => {
                    const color = getModelColor(modelLabel);
                    return (
                      <Area
                        key={modelLabel}
                        type="monotone"
                        dataKey={modelLabel}
                        name={modelLabel}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.1}
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-black/[.02] p-3 dark:bg-white/[.04]">
          <p className="mb-3 text-xs text-gray-500 dark:text-zinc-500">
            モデル別使用状況
          </p>
          <div className="h-[180px]">
            {modelRows.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-zinc-500">
                モデル情報はまだありません
              </div>
            ) : (
              <div className="flex h-full items-center gap-3">
                <div className="h-full min-w-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelRows}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={50}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                        paddingAngle={2}
                      >
                        {modelRows.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={getModelColor(entry.name)}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-[112px] shrink-0 flex-col gap-2">
                  {modelRows.slice(0, 6).map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-[10px]"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: getModelColor(item.name),
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-zinc-400">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== コネクタログ行 ===== */

const RecentLogRow = ({ item }: { item: DashboardLogItem }): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const status = toStatusKey(item);
  const badge = statusBadge(status);
  const logo = getClientLogo(item.clientName);
  const time = new Date(item.createdAt).toLocaleTimeString("ja-JP", {
    hour12: false,
  });

  return (
    <div
      className={`grid grid-cols-[70px_80px_120px_1fr_85px_50px] items-center gap-2 border-b border-b-gray-100 px-5 py-2.5 text-xs transition-colors dark:border-b-white/[.03] ${
        isErrorRow(status) ? "bg-red-500/[0.03]" : ""
      }`}
    >
      <span className="font-mono text-[11px] text-gray-400 dark:text-zinc-600">
        {time}
      </span>
      <div className="flex items-center gap-1.5 overflow-hidden">
        {logo ? (
          <img
            src={theme === "dark" ? logo.dark : logo.light}
            alt={item.clientName ?? ""}
            className="h-4 w-4 rounded-sm"
          />
        ) : (
          <Bot className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
        )}
        <span className="truncate text-[11px] text-gray-500 dark:text-zinc-500">
          {item.clientName ?? "-"}
        </span>
      </div>
      <span className="truncate text-gray-600 dark:text-zinc-400">
        {item.connectionName ?? "不明"}
      </span>
      <span className="truncate font-mono text-[11px] text-gray-500 dark:text-zinc-500">
        {item.toolName}
      </span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.className}`}
      >
        {badge.label}
      </span>
      <span className="text-right font-mono text-[11px] text-gray-400 dark:text-zinc-600">
        {item.durationMs}ms
      </span>
    </div>
  );
};

/* ===== メインコンポーネント ===== */

export const Dashboard = (): JSX.Element => {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const theme = useAtomValue(themeAtom);
  const { result, loading } = useDashboard(period);
  const telemetryDays = PERIOD_TO_TELEMETRY_DAYS[period];
  const aiUsage = useAiCodingTelemetryUsage(telemetryDays);

  const cursorColor = theme === "dark" ? "#ffffff" : "#111827";
  const resolveColor = (color: string): string =>
    color === "#fff" || color === "#ffffff" ? cursorColor : color;

  const series: DashboardConnectorSeries[] = result?.series ?? [];
  const timeline: DashboardTimePoint[] = result?.timeline ?? [];
  const aiClients: DashboardAiClient[] = result?.aiClients ?? [];
  const connectors: DashboardConnectorCard[] = result?.connectors ?? [];
  const recentLogs: DashboardLogItem[] = result?.recentLogs ?? [];

  // recharts は { time: string, [seriesKey]: number } のフラットな形式を期待するため変換
  const chartData = useMemo(
    () =>
      timeline.map((point) => ({
        time: point.label,
        ...point.values,
      })),
    [timeline],
  );

  const kpiCards = useMemo(
    () => [
      ...buildKpiCards(result?.kpi ?? DEFAULT_KPI, period),
      ...buildAiKpiCards(aiUsage.memberUsage, aiUsage.summary, period),
    ],
    [aiUsage.memberUsage, aiUsage.summary, result, period],
  );

  const handleToggleAi = (name: string): void => {
    setActiveAi(activeAi === name ? null : name);
  };

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          ダッシュボード
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-black/[.02] p-0.5 dark:bg-white/[.04]">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-2.5 py-1 text-[11px] transition-colors ${
                period === p
                  ? "bg-black/[.06] text-gray-900 dark:bg-white/[.08] dark:text-white"
                  : "bg-transparent text-gray-400 dark:text-zinc-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[.08] dark:bg-zinc-900"
          >
            <span className="text-xs text-gray-500 dark:text-zinc-500">
              {card.label}
            </span>
            <div className={`mt-2 text-2xl font-semibold ${card.colorClass}`}>
              {card.value}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-500 dark:text-zinc-500">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* コネクタ別アクセス推移 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[.08] dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
            コネクタ別アクセス推移
          </span>
          <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 dark:text-zinc-600">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: resolveColor(s.color) }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[200px]">
          {series.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-zinc-500">
              {loading ? "読み込み中..." : "まだ利用ログがありません"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {series.map((s) => (
                    <linearGradient
                      key={s.key}
                      id={`g-${s.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={resolveColor(s.color)}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={resolveColor(s.color)}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    theme === "dark" ? "rgba(255,255,255,0.08)" : "#e5e7eb"
                  }
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{
                    fill: theme === "dark" ? "#71717a" : "#9ca3af",
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                {series.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={resolveColor(s.color)}
                    strokeWidth={1.5}
                    fill={`url(#g-${s.key})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <AiCodingAnalyticsSection
        period={period}
        resolveColor={resolveColor}
        summary={aiUsage.summary}
        dailyModelUsage={aiUsage.dailyModelUsage}
        modelUsage={aiUsage.modelUsage}
        isLoading={aiUsage.isLoading}
      />

      {/* 2カラム: AIクライアント別 + コネクタ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AiClientsSection
          aiClients={aiClients}
          activeAi={activeAi}
          onToggleAi={handleToggleAi}
          resolveColor={resolveColor}
        />

        {/* 右: コネクタ */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[.08] dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
              コネクタ
            </span>
            <Link
              to="/tools"
              className="flex items-center gap-1 text-[11px] text-gray-500 transition-colors hover:opacity-80 dark:text-zinc-500"
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {connectors.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500 dark:text-zinc-500">
              {loading ? "読み込み中..." : "登録されたコネクタはありません"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {connectors.map((c) => (
                <div
                  key={c.connectionId}
                  className="flex items-center gap-2.5 rounded-lg bg-black/[.02] px-3 py-2 dark:bg-white/[.04]"
                >
                  <ConnectorIcon name={c.name} iconPath={c.iconPath} />
                  <span className="flex-1 truncate text-xs text-gray-600 dark:text-zinc-400">
                    {c.name}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      c.status === "active"
                        ? "bg-emerald-400"
                        : c.status === "degraded"
                          ? "bg-red-400"
                          : "bg-amber-400"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* コネクタログ + お知らせ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.4fr]">
        {/* コネクタログ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-b-gray-200 px-5 py-3 dark:border-b-white/[.08]">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                コネクタログ
              </span>
            </div>
            <Link
              to="/history"
              className="flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:opacity-80 dark:text-zinc-500"
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-[70px_80px_120px_1fr_85px_50px] items-center gap-2 border-b border-b-gray-200 px-5 py-2 text-[10px] text-gray-400 dark:border-b-white/[.08] dark:text-zinc-600">
            <span>日時</span>
            <span>AIクライアント</span>
            <span>接続先</span>
            <span>ツール / アクション</span>
            <span>ステータス</span>
            <span className="text-right">応答</span>
          </div>
          {recentLogs.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500 dark:text-zinc-500">
              {loading ? "読み込み中..." : "まだ利用ログがありません"}
            </p>
          ) : (
            recentLogs.map((item) => <RecentLogRow key={item.id} item={item} />)
          )}
        </div>

        {/* お知らせ */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[.08] dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-gray-400 dark:text-zinc-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
              お知らせ
            </span>
          </div>
          <div className="space-y-3">
            {ANNOUNCEMENTS.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-xs">
                <span className="text-gray-400 dark:text-zinc-600">
                  {a.date}
                </span>
                {a.link ? (
                  <Link
                    to={a.link}
                    className="text-gray-900 transition-colors hover:opacity-80 dark:text-white"
                  >
                    {a.message}
                  </Link>
                ) : (
                  <span className="text-gray-500 dark:text-zinc-500">
                    {a.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
