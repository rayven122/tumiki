import { useState } from "react";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity, ArrowRight, Megaphone } from "lucide-react";
import { themeAtom } from "../../store/atoms";
import { HISTORY, ANNOUNCEMENTS } from "../../data/mock";
import { statusBadge, isErrorRow } from "../../utils/theme-styles";
import {
  AI_CLIENTS,
  AI_PIE,
  CHART_LEGENDS,
  MAX_SERVICE_REQUESTS,
  PERIOD_STATS,
  PERIODS,
  SERVICES,
  TRAFFIC_MAP,
} from "../../data/admin-dashboard-data";
import type { Period } from "../../data/admin-dashboard-data";
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

/* ---------- AreaChart ツールチップ ---------- */

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}): JSX.Element | null => {
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

/* ---------- メインコンポーネント ---------- */

export const AdminDashboard = (): JSX.Element => {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const theme = useAtomValue(themeAtom);
  const stats = PERIOD_STATS[period];

  // Cursorの色はテーマに応じて切替（白背景で白は見えないため）
  const cursorColor = theme === "dark" ? "#ffffff" : "#111827";

  // テーマ対応の色解決（#fffをcursorColorに差し替え）
  const resolveColor = (color: string) =>
    color === "#fff" ? cursorColor : color;

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー: タイトル + 期間切替 */}
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
        {/* リクエスト */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            リクエスト / {period}
          </span>
          <div
            className="mt-2 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {stats.requests}
          </div>
          <div
            className="mt-0.5 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {stats.requestsSub}
          </div>
        </div>

        {/* ブロック */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            ブロック
          </span>
          <div
            className="mt-2 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {stats.blocks}
          </div>
          <div className="mt-0.5 text-[10px] text-red-400">
            {stats.blocksSub}
          </div>
        </div>

        {/* コネクタ */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            コネクタ
          </span>
          <div
            className="mt-2 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            8
          </div>
          <div
            className="mt-0.5 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            5 稼働中
          </div>
        </div>

        {/* ユーザー */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            ユーザー
          </span>
          <div
            className="mt-2 text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {stats.users}
          </div>
          <div
            className="mt-0.5 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {stats.usersSub}
          </div>
        </div>
      </div>

      {/* AIクライアント別リクエスト推移 AreaChart */}
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
            AIクライアント別リクエスト推移
          </span>
          {/* 凡例 */}
          <div
            className="flex flex-wrap gap-3 text-[10px]"
            style={{ color: "var(--text-subtle)" }}
          >
            {CHART_LEGENDS.map((l) => (
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
              {CHART_LEGENDS.map((l) => (
                <Area
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.label}
                  stroke={resolveColor(l.color)}
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

      {/* 2カラム下段 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左: AIクライアント別ドーナツチャート + 構成比テーブル + バッジ */}
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

          {/* ドーナツ + 構成比を横並び */}
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
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1">
              {AI_PIE.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
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
            </div>
          </div>

          {/* AIクライアントバッジ（フィルタ） */}
          <div className="mt-4 flex flex-wrap gap-2">
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
                  opacity: activeAi === null || activeAi === ai.name ? 1 : 0.5,
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

        {/* 右: 接続先サービスリスト */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <span
            className="mb-4 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            接続先サービス
          </span>
          <div className="space-y-3">
            {SERVICES.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5 text-xs">
                <img
                  src={theme === "dark" ? s.dark : s.light}
                  alt={s.name}
                  className="h-4 w-4 rounded"
                />
                <span
                  className="w-24"
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
          {/* ヘッダー */}
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
              to="/admin/history"
              className="flex items-center gap-1 text-[10px] transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* テーブルヘッダー */}
          <div
            className="grid grid-cols-[70px_70px_80px_120px_1fr_85px_50px] items-center gap-2 px-5 py-2 text-[10px]"
            style={{
              borderBottom: "1px solid var(--border)",
              color: "var(--text-subtle)",
            }}
          >
            <span>日時</span>
            <span>ユーザー</span>
            <span>AIクライアント</span>
            <span>接続先</span>
            <span>ツール / アクション</span>
            <span>ステータス</span>
            <span className="text-right">応答</span>
          </div>

          {/* テーブル行 */}
          {HISTORY.slice(0, 6).map((item) => {
            const badge = statusBadge(item.status);
            return (
              <div
                key={item.id}
                className="grid grid-cols-[70px_70px_80px_120px_1fr_85px_50px] items-center gap-2 px-5 py-2.5 text-xs transition-colors"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor: isErrorRow(item.status)
                    ? "rgba(239,68,68,0.03)"
                    : "transparent",
                }}
              >
                {/* 日時 */}
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {item.datetime.split(" ")[1]?.slice(0, 8)}
                </span>

                {/* ユーザー */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium"
                    style={{
                      backgroundColor:
                        item.user === "不明"
                          ? "var(--badge-error-bg)"
                          : "var(--bg-active)",
                      color:
                        item.user === "不明"
                          ? "var(--badge-error-text)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {item.user.charAt(0)}
                  </div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.user}
                  </span>
                </div>

                {/* AIクライアント */}
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

                {/* 接続先サービス */}
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

                {/* ツール / アクション */}
                <span
                  className="truncate font-mono text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.operation}
                </span>

                {/* ステータス */}
                <span
                  className="rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>

                {/* 応答時間 */}
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
          <span
            className="mb-4 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            お知らせ
          </span>
          <div className="space-y-3">
            {ANNOUNCEMENTS.map((a) => {
              const content = (
                <div key={a.id} className="flex items-start gap-2.5 text-xs">
                  <Megaphone
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <span
                    className="flex-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {a.message}
                  </span>
                  <span
                    className="shrink-0 font-mono"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {a.date}
                  </span>
                </div>
              );
              return a.link ? (
                <Link
                  key={a.id}
                  to={a.link}
                  className="block rounded-lg px-2 py-1.5 transition-colors hover:opacity-80"
                  style={{ backgroundColor: "var(--bg-card-hover)" }}
                >
                  {content}
                </Link>
              ) : (
                <div key={a.id} className="px-2 py-1.5">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
