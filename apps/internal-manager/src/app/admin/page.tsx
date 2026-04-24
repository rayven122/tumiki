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
  type Period,
} from "./_components/mock-data";

const STATUS_BADGE_MAP: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  success: {
    bg: "var(--badge-success-bg)",
    text: "var(--badge-success-text)",
    label: "成功",
  },
  blocked: {
    bg: "var(--badge-error-bg)",
    text: "var(--badge-error-text)",
    label: "ブロック",
  },
  error: {
    bg: "var(--badge-error-bg)",
    text: "var(--badge-error-text)",
    label: "エラー",
  },
};
const DEFAULT_BADGE = {
  bg: "var(--badge-error-bg)",
  text: "var(--badge-error-text)",
  label: "エラー",
};
const statusBadge = (status: string) =>
  STATUS_BADGE_MAP[status] ?? DEFAULT_BADGE;

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
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: "var(--text-secondary)" }}>{entry.name}:</span>
          <span style={{ color: "var(--text-primary)" }}>
            {entry.value.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const stats = PERIOD_STATS[period];

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          ダッシュボード
        </h1>
        <div
          className="flex items-center gap-1 rounded-lg p-0.5"
          style={{ backgroundColor: "var(--bg-card-hover)" }}
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="rounded px-2.5 py-1 text-[11px] transition-colors"
              style={{
                backgroundColor:
                  period === p ? "var(--bg-active)" : "transparent",
                color:
                  period === p ? "var(--text-primary)" : "var(--text-subtle)",
              }}
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
            subColor: "var(--text-muted)",
          },
          {
            label: "ブロック",
            value: stats.blocks,
            sub: stats.blocksSub,
            subColor: "#f87171",
          },
          {
            label: "コネクタ",
            value: "8",
            sub: "5 稼働中",
            subColor: "var(--text-muted)",
          },
          {
            label: "ユーザー",
            value: stats.users,
            sub: stats.usersSub,
            subColor: "var(--text-muted)",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {card.label}
            </span>
            <div
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {card.value}
            </div>
            <div
              className="mt-0.5 text-[10px]"
              style={{ color: card.subColor }}
            >
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* AIクライアント別リクエスト推移 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            AIクライアント別リクエスト推移
          </span>
          <div
            className="flex flex-wrap gap-3 text-[10px]"
            style={{ color: "var(--text-subtle)" }}
          >
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
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--text-subtle)", fontSize: 10 }}
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
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="mb-3 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
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
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.name}
                  </span>
                  <span
                    className="ml-auto font-mono"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {item.value}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 接続先サービス */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="mb-4 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
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
                <span
                  className="w-28 truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.name}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : "bg-zinc-700"}`}
                />
                <div
                  className="h-1.5 flex-1 rounded-full"
                  style={{ backgroundColor: "var(--bg-card-hover)" }}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${(s.requests / MAX_SERVICE_REQUESTS) * 100}%`,
                      backgroundColor: "var(--text-muted)",
                    }}
                  />
                </div>
                <span
                  className="w-12 text-right font-mono"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {s.requests.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近のログ */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Activity
              className="h-4 w-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              最近のログ
            </span>
          </div>
          <Link
            href="/admin/history"
            className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            すべて見る <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* テーブルヘッダー */}
        <div
          className="grid grid-cols-[90px_90px_100px_120px_1fr_80px_55px] items-center gap-2 px-5 py-2 text-[10px]"
          style={{
            borderBottom: "1px solid var(--border)",
            color: "var(--text-subtle)",
          }}
        >
          <span>日時</span>
          <span>ユーザー</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>操作</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {AUDIT_LOGS.slice(0, 6).map((log) => {
          const badge = statusBadge(log.status);
          return (
            <div
              key={log.id}
              className="grid grid-cols-[90px_90px_100px_120px_1fr_80px_55px] items-center gap-2 px-5 py-2.5 text-xs transition-colors"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                backgroundColor:
                  log.status !== "success"
                    ? "rgba(239,68,68,0.03)"
                    : "transparent",
              }}
            >
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {log.datetime.split(" ")[1]}
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium"
                  style={{
                    backgroundColor:
                      log.user === "不明"
                        ? "var(--badge-error-bg)"
                        : "var(--bg-active)",
                    color:
                      log.user === "不明"
                        ? "var(--badge-error-text)"
                        : "var(--text-secondary)",
                  }}
                >
                  {log.user.charAt(0)}
                </div>
                <span
                  className="truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {log.user}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: log.aiClientColor }}
                />
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
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
                <span style={{ color: "var(--text-secondary)" }}>
                  {log.tool}
                </span>
              </div>
              <span
                className="truncate font-mono text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {log.operation}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
              <span
                className="text-right font-mono text-[11px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {log.latency}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
