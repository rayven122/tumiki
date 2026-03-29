import { useState } from "react";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity, ArrowRight, Megaphone } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { HISTORY, ANNOUNCEMENTS } from "../data/mock";
import {
  CONNECTOR_MAP,
  CONNECTOR_LEGENDS,
  AI_PIE,
  AI_CLIENTS,
  CONNECTORS,
  PERIOD_STATS,
  PERIODS,
  type Period,
} from "../data/dashboard-data";
import { statusBadge, isErrorRow } from "../utils/theme-styles";
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

/* ===== チャートツールチップ ===== */

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
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
      {payload.map((p) => (
        <p key={p.name} style={{ color: "var(--text-primary)" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ===== メインコンポーネント ===== */

export const Dashboard = (): JSX.Element => {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const theme = useAtomValue(themeAtom);
  const stats = PERIOD_STATS[period];

  const cursorColor = theme === "dark" ? "#ffffff" : "#111827";
  const resolveColor = (color: string) =>
    color === "#fff" ? cursorColor : color;

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          ダッシュボード
        </h2>
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

      {/* KPIカード 4つ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: `リクエスト / ${period}`,
            value: stats.requests,
            sub: stats.requestsSub,
            color: "var(--text-primary)",
          },
          {
            label: "ブロック",
            value: stats.blocks,
            sub: stats.blocksSub,
            color: "var(--badge-error-text)",
          },
          {
            label: "成功率",
            value: stats.successRate,
            sub: stats.successSub,
            color: "var(--badge-success-text)",
          },
          {
            label: "コネクタ",
            value: stats.connectors,
            sub: stats.connectorsSub,
            color: "var(--text-primary)",
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
              style={{ color: card.color }}
            >
              {card.value}
            </div>
            <div
              className="mt-0.5 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* コネクタ別アクセス推移 */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            コネクタ別アクセス推移
          </span>
          <div
            className="flex flex-wrap gap-3 text-[10px]"
            style={{ color: "var(--text-subtle)" }}
          >
            {CONNECTOR_LEGENDS.map((l) => (
              <span key={l.label} className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: resolveColor(l.color) }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CONNECTOR_MAP[period]}>
              <defs>
                {CONNECTOR_LEGENDS.map((l) => (
                  <linearGradient
                    key={l.key}
                    id={`g-${l.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={resolveColor(l.color)}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={resolveColor(l.color)}
                      stopOpacity={0}
                    />
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
              {CONNECTOR_LEGENDS.map((l) => (
                <Area
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.label}
                  stroke={resolveColor(l.color)}
                  strokeWidth={1.5}
                  fill={`url(#g-${l.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2カラム: AIクライアント別 + コネクタ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左: AIクライアント別 */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
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
              {AI_PIE.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: resolveColor(item.color) }}
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
                </div>
              ))}
              {/* AIクライアントバッジ */}
              <div
                className="mt-3 flex flex-wrap gap-1.5 pt-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {AI_CLIENTS.map((ai) => (
                  <button
                    key={ai.name}
                    onClick={() =>
                      setActiveAi(activeAi === ai.name ? null : ai.name)
                    }
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
                    style={{
                      backgroundColor:
                        activeAi === null || activeAi === ai.name
                          ? "var(--bg-active)"
                          : "var(--bg-card-hover)",
                      opacity:
                        activeAi === null || activeAi === ai.name ? 1 : 0.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <img
                      src={theme === "dark" ? ai.dark : ai.light}
                      alt={ai.name}
                      className="h-3.5 w-3.5 rounded"
                    />
                    <span className="text-[10px]">{ai.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右: コネクタ */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              コネクタ
            </span>
            <Link
              to="/tools"
              className="flex items-center gap-1 text-[11px] transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CONNECTORS.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                style={{ backgroundColor: "var(--bg-card-hover)" }}
              >
                <img
                  src={theme === "dark" ? s.dark : s.light}
                  alt={s.name}
                  className="h-5 w-5 shrink-0 rounded"
                />
                <span
                  className="flex-1 truncate text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.name}
                </span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* コネクタログ + お知らせ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.4fr]">
        {/* コネクタログ */}
        <div
          className="overflow-hidden rounded-xl"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
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
                コネクタログ
              </span>
            </div>
            <Link
              to="/history"
              className="flex items-center gap-1 text-[10px] transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div
            className="grid grid-cols-[70px_80px_120px_1fr_85px_50px] items-center gap-2 px-5 py-2 text-[10px]"
            style={{
              borderBottom: "1px solid var(--border)",
              color: "var(--text-subtle)",
            }}
          >
            <span>日時</span>
            <span>AIクライアント</span>
            <span>接続先</span>
            <span>ツール / アクション</span>
            <span>ステータス</span>
            <span className="text-right">応答</span>
          </div>
          {HISTORY.slice(0, 6).map((item) => {
            const badge = statusBadge(item.status);
            return (
              <div
                key={item.id}
                className="grid grid-cols-[70px_80px_120px_1fr_85px_50px] items-center gap-2 px-5 py-2.5 text-xs transition-colors"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor: isErrorRow(item.status)
                    ? "rgba(239,68,68,0.03)"
                    : "transparent",
                }}
              >
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {item.datetime.split(" ")[1]?.slice(0, 8)}
                </span>
                <div className="flex items-center gap-1.5">
                  <img
                    src={
                      theme === "dark"
                        ? item.aiClient.logoDark
                        : item.aiClient.logoLight
                    }
                    alt={item.aiClient.name}
                    className="h-4 w-4 rounded-sm"
                  />
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.aiClient.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img
                    src={
                      theme === "dark"
                        ? item.service.logoDark
                        : item.service.logoLight
                    }
                    alt={item.service.name}
                    className="h-4 w-4 rounded-sm"
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.service.name}
                  </span>
                </div>
                <span
                  className="truncate font-mono text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.operation}
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
                  {item.latency}
                </span>
              </div>
            );
          })}
        </div>

        {/* お知らせ */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Megaphone
              className="h-4 w-4"
              style={{ color: "var(--text-subtle)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              お知らせ
            </span>
          </div>
          <div className="space-y-3">
            {ANNOUNCEMENTS.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-xs">
                <span style={{ color: "var(--text-subtle)" }}>{a.date}</span>
                {a.link ? (
                  <Link
                    to={a.link}
                    className="transition-colors hover:opacity-80"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.message}
                  </Link>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>
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
