"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
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
import { api, type RouterOutputs } from "~/trpc/react";

type Period = "24h" | "7d" | "30d";
type LogStatus = "success" | "blocked" | "error";
type DashboardData = RouterOutputs["dashboard"]["get"];
type RecentLogItem = DashboardData["recentLogs"][number];

const PERIODS: Period[] = ["24h", "7d", "30d"];

const getStatusBadge = (status: LogStatus) => {
  switch (status) {
    case "success":
      return {
        label: "成功",
        bg: "bg-badge-success-bg",
        text: "text-badge-success-text",
      };
    case "blocked":
      return {
        label: "ブロック",
        bg: "bg-badge-warning-bg",
        text: "text-badge-warning-text",
      };
    case "error":
      return {
        label: "エラー",
        bg: "bg-badge-error-bg",
        text: "text-badge-error-text",
      };
  }
};

const formatTime = (value: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);

const formatDelta = (value: number) => {
  if (value === 0) return "前期間比 0%";
  return `前期間比 ${value > 0 ? "+" : ""}${value}%`;
};

const getUserLabel = (log: RecentLogItem) =>
  log.user.name ?? log.user.email ?? log.user.id;

const getToolColor = (value: string) => {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
  const hash = Array.from(value).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return colors[hash % colors.length] ?? colors[0];
};

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border-border-default rounded-lg border px-3 py-2 text-xs shadow-xl">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="text-text-primary">
            {entry.value.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
};

const EmptyPanel = ({ label }: { label: string }) => (
  <div className="text-text-muted flex h-full min-h-32 items-center justify-center text-sm">
    {label}
  </div>
);

const AdminDashboardPage = () => {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const dashboardQuery = api.dashboard.get.useQuery({ period });
  const data = dashboardQuery.data;
  const chartData = data?.timeline.map((point) => ({
    time: point.label,
    ...point.values,
  }));
  const maxServiceRequests = Math.max(
    1,
    ...(data?.services.map((service) => service.count) ?? []),
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-lg font-semibold">
          ダッシュボード
        </h1>
        <div className="bg-bg-card-hover flex items-center gap-1 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2.5 py-1 text-[11px] transition-colors ${
                period === p
                  ? "bg-bg-active text-text-primary"
                  : "text-text-subtle"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {dashboardQuery.isError ? (
        <div className="bg-bg-card border-border-default text-badge-error-text rounded-xl border p-6 text-center text-sm">
          ダッシュボードデータを取得できませんでした
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: `リクエスト / ${period}`,
            value: (data?.kpi.requests ?? 0).toLocaleString(),
            sub: formatDelta(data?.kpi.requestsDelta ?? 0),
            subClass:
              (data?.kpi.requestsDelta ?? 0) >= 0
                ? "text-emerald-400"
                : "text-[#f87171]",
          },
          {
            label: "ブロック",
            value: (data?.kpi.blocks ?? 0).toLocaleString(),
            sub: `${data?.kpi.blockRate ?? 0}%`,
            subClass: "text-[#f87171]",
          },
          {
            label: "コネクタ",
            value: (data?.kpi.connectors ?? 0).toLocaleString(),
            sub: `${data?.kpi.connectorsActive ?? 0} 利用あり`,
            subClass: "text-text-muted",
          },
          {
            label: "ユーザー",
            value: (data?.kpi.users ?? 0).toLocaleString(),
            sub: `${data?.kpi.usersWithRequests ?? 0} 利用中`,
            subClass: "text-text-muted",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <span className="text-text-muted text-xs">{card.label}</span>
            <div className="text-text-primary mt-2 text-2xl font-semibold">
              {dashboardQuery.isLoading ? "..." : card.value}
            </div>
            <div className={`mt-0.5 text-[10px] ${card.subClass}`}>
              {dashboardQuery.isLoading ? "読み込み中" : card.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border-border-default rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-text-secondary text-sm font-medium">
            AIクライアント別リクエスト推移
          </span>
          <div className="text-text-subtle flex flex-wrap gap-3 text-[10px]">
            {(data?.series ?? []).map((series) => (
              <span key={series.key} className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[200px]">
          {dashboardQuery.isLoading ? (
            <EmptyPanel label="読み込み中" />
          ) : (data?.series.length ?? 0) === 0 ? (
            <EmptyPanel label="表示できる監査ログはありません" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {data?.series.map((series) => (
                    <linearGradient
                      key={series.key}
                      id={`g-${series.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={series.color}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={series.color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border-default)"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "var(--color-text-subtle)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                {data?.series.map((series) => (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={1.5}
                    fill={`url(#g-${series.key})`}
                    strokeOpacity={
                      activeAi === null || activeAi === series.label ? 1 : 0.1
                    }
                    fillOpacity={
                      activeAi === null || activeAi === series.label ? 1 : 0.05
                    }
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-bg-card border-border-default rounded-xl border p-5">
          <span className="text-text-secondary mb-3 block text-sm font-medium">
            AIクライアント別
          </span>
          {dashboardQuery.isLoading ? (
            <EmptyPanel label="読み込み中" />
          ) : (data?.aiClients.length ?? 0) === 0 ? (
            <EmptyPanel label="表示できる監査ログはありません" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-[150px] w-[150px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.aiClients}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={46}
                      dataKey="percentage"
                      stroke="none"
                      paddingAngle={2}
                    >
                      {data?.aiClients.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          opacity={
                            activeAi === null || activeAi === entry.name
                              ? 1
                              : 0.2
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1">
                {data?.aiClients.map((item) => (
                  <button
                    key={item.name}
                    onClick={() =>
                      setActiveAi(activeAi === item.name ? null : item.name)
                    }
                    className="flex min-w-0 items-center gap-1.5 text-[10px] transition-opacity"
                    style={{
                      opacity:
                        activeAi === null || activeAi === item.name ? 1 : 0.4,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-text-secondary truncate">
                      {item.name}
                    </span>
                    <span className="text-text-subtle ml-auto font-mono">
                      {item.percentage}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-bg-card border-border-default rounded-xl border p-5">
          <span className="text-text-secondary mb-4 block text-sm font-medium">
            接続先サービス
          </span>
          {dashboardQuery.isLoading ? (
            <EmptyPanel label="読み込み中" />
          ) : (data?.services.length ?? 0) === 0 ? (
            <EmptyPanel label="表示できる監査ログはありません" />
          ) : (
            <div className="space-y-2.5">
              {data?.services.map((service) => (
                <div
                  key={`${service.mcpServerId}:${service.name}`}
                  className="flex items-center gap-2.5 text-xs"
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                    style={{ backgroundColor: service.color }}
                  >
                    {service.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-text-secondary w-28 truncate">
                    {service.name}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <div className="bg-bg-card-hover h-1.5 flex-1 rounded-full">
                    <div
                      className="bg-text-muted h-1.5 rounded-full"
                      style={{
                        width: `${(service.count / maxServiceRequests) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-text-subtle w-12 text-right font-mono">
                    {service.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        <div className="border-b-border-default flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Activity className="text-text-muted h-4 w-4" />
            <span className="text-text-primary text-sm font-medium">
              最近のログ
            </span>
          </div>
          <Link
            href="/admin/history"
            className="text-text-muted flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
          >
            すべて見る <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="border-b-border-default text-text-subtle grid grid-cols-[90px_100px_120px_120px_1fr_80px_55px] items-center gap-2 border-b px-5 py-2 text-[10px]">
          <span>日時</span>
          <span>ユーザー</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>操作</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {dashboardQuery.isLoading ? (
          <div className="text-text-muted flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            読み込み中
          </div>
        ) : (data?.recentLogs.length ?? 0) === 0 ? (
          <div className="text-text-muted py-8 text-center text-sm">
            最近のログはありません
          </div>
        ) : (
          data?.recentLogs.map((log) => {
            const badge = getStatusBadge(log.status);
            const userLabel = getUserLabel(log);
            const serviceName = log.connectionName ?? log.mcpServerId;
            return (
              <div
                key={log.id}
                className="border-b-border-subtle grid grid-cols-[90px_100px_120px_120px_1fr_80px_55px] items-center gap-2 border-b px-5 py-2.5 text-xs transition-colors"
                style={{
                  backgroundColor:
                    log.status !== "success"
                      ? "rgba(239,68,68,0.03)"
                      : "transparent",
                }}
              >
                <span className="text-text-subtle font-mono text-[11px]">
                  {formatTime(log.occurredAt)}
                </span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="bg-bg-active text-text-secondary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium">
                    {userLabel.charAt(0)}
                  </div>
                  <span className="text-text-secondary truncate">
                    {userLabel}
                  </span>
                </div>
                <span className="text-text-muted truncate text-[11px]">
                  {log.clientName ?? "不明"}
                </span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                    style={{ backgroundColor: getToolColor(serviceName) }}
                  >
                    {serviceName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-text-secondary truncate">
                    {serviceName}
                  </span>
                </div>
                <span className="text-text-muted truncate font-mono text-[11px]">
                  {log.method}:{log.toolName}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
                <span className="text-text-subtle text-right font-mono text-[11px]">
                  {log.durationMs}ms
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
