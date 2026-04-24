"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
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
import {
  AI_PIE,
  AUDIT_LOGS,
  CHART_LEGENDS,
  CONNECTED_SERVICES,
  MAX_SERVICE_REQUESTS,
  PERIOD_STATS,
  PERIODS,
  TRAFFIC_MAP,
  getStatusBadge,
  type Period,
} from "./_components/mock-data";

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

const AdminDashboardPage = () => {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const stats = PERIOD_STATS[period];

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-lg font-semibold">
          ダッシュボード
        </h1>
        <div className="bg-bg-card-hover flex items-center gap-1 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2.5 py-1 text-[11px] transition-colors ${period === p ? "bg-bg-active text-text-primary" : "text-text-subtle"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: `リクエスト / ${period}`,
            value: stats.requests,
            sub: stats.requestsSub,
            subClass: "text-text-muted",
          },
          {
            label: "ブロック",
            value: stats.blocks,
            sub: stats.blocksSub,
            subClass: "text-[#f87171]",
          },
          {
            label: "コネクタ",
            value: "8",
            sub: "5 稼働中",
            subClass: "text-text-muted",
          },
          {
            label: "ユーザー",
            value: stats.users,
            sub: stats.usersSub,
            subClass: "text-text-muted",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <span className="text-text-muted text-xs">{card.label}</span>
            <div className="text-text-primary mt-2 text-2xl font-semibold">
              {card.value}
            </div>
            <div className={`mt-0.5 text-[10px] ${card.subClass}`}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* AIクライアント別リクエスト推移 */}
      <div className="bg-bg-card border-border-default rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-text-secondary text-sm font-medium">
            AIクライアント別リクエスト推移
          </span>
          <div className="text-text-subtle flex flex-wrap gap-3 text-[10px]">
            {CHART_LEGENDS.map((l) => (
              <span key={l.label} className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TRAFFIC_MAP[period]}>
              <defs>
                {CHART_LEGENDS.map((l) => (
                  <linearGradient
                    key={l.key}
                    id={`g-${l.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={l.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={l.color} stopOpacity={0} />
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
              {CHART_LEGENDS.map((l) => (
                <Area
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.label}
                  stroke={l.color}
                  strokeWidth={1.5}
                  fill={`url(#g-${l.key})`}
                  strokeOpacity={
                    activeAi === null || activeAi === l.label ? 1 : 0.1
                  }
                  fillOpacity={
                    activeAi === null || activeAi === l.label ? 1 : 0.05
                  }
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 下段2カラム */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* AIクライアント別ドーナツ */}
        <div className="bg-bg-card border-border-default rounded-xl border p-5">
          <span className="text-text-secondary mb-3 block text-sm font-medium">
            AIクライアント別
          </span>
          <div className="flex items-center gap-4">
            <div className="h-[150px] w-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={AI_PIE}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={46}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={2}
                  >
                    {AI_PIE.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        opacity={
                          activeAi === null || activeAi === entry.name ? 1 : 0.2
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1">
              {AI_PIE.map((item) => (
                <button
                  key={item.name}
                  onClick={() =>
                    setActiveAi(activeAi === item.name ? null : item.name)
                  }
                  className="flex items-center gap-1.5 text-[10px] transition-opacity"
                  style={{
                    opacity:
                      activeAi === null || activeAi === item.name ? 1 : 0.4,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-text-secondary">{item.name}</span>
                  <span className="text-text-subtle ml-auto font-mono">
                    {item.value}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 接続先サービス */}
        <div className="bg-bg-card border-border-default rounded-xl border p-5">
          <span className="text-text-secondary mb-4 block text-sm font-medium">
            接続先サービス
          </span>
          <div className="space-y-2.5">
            {CONNECTED_SERVICES.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5 text-xs">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                  style={{ backgroundColor: s.color }}
                >
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-text-secondary w-28 truncate">
                  {s.name}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : "bg-zinc-700"}`}
                />
                <div className="bg-bg-card-hover h-1.5 flex-1 rounded-full">
                  <div
                    className="bg-text-muted h-1.5 rounded-full"
                    style={{
                      width: `${(s.requests / MAX_SERVICE_REQUESTS) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-text-subtle w-12 text-right font-mono">
                  {s.requests.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近のログ */}
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

        {/* テーブルヘッダー */}
        <div className="border-b-border-default text-text-subtle grid grid-cols-[90px_90px_100px_120px_1fr_80px_55px] items-center gap-2 border-b px-5 py-2 text-[10px]">
          <span>日時</span>
          <span>ユーザー</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>操作</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {AUDIT_LOGS.slice(0, 6).map((log) => {
          const badge = getStatusBadge(log.status);
          return (
            <div
              key={log.id}
              className="border-b-border-subtle grid grid-cols-[90px_90px_100px_120px_1fr_80px_55px] items-center gap-2 border-b px-5 py-2.5 text-xs transition-colors"
              style={{
                backgroundColor:
                  log.status !== "success"
                    ? "rgba(239,68,68,0.03)"
                    : "transparent",
              }}
            >
              <span className="text-text-subtle font-mono text-[11px]">
                {log.datetime.split(" ")[1]}
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${log.user === "不明" ? "bg-badge-error-bg text-badge-error-text" : "bg-bg-active text-text-secondary"}`}
                >
                  {log.user.charAt(0)}
                </div>
                <span className="text-text-secondary truncate">{log.user}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: log.aiClientColor }}
                />
                <span className="text-text-muted text-[11px]">
                  {log.aiClient}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                  style={{ backgroundColor: log.toolColor }}
                >
                  {log.tool.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-text-secondary">{log.tool}</span>
              </div>
              <span className="text-text-muted truncate font-mono text-[11px]">
                {log.operation}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
              <span className="text-text-subtle text-right font-mono text-[11px]">
                {log.latency}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
