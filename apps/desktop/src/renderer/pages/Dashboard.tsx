import type { JSX } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  ShieldAlert,
  Wrench,
  FileText,
  ArrowRight,
  Megaphone,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLS, HISTORY, CURRENT_USER, ANNOUNCEMENTS } from "../data/mock";
import type { ToolStatus } from "../data/mock";

/** ステータスに応じたドット色 */
const statusDotColor: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

/** ステータスバッジの色マッピング */
const statusBadgeStyle: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  success: {
    bg: "var(--badge-success-bg)",
    text: "var(--badge-success-text)",
    label: "成功",
  },
  timeout: {
    bg: "var(--badge-warn-bg)",
    text: "var(--badge-warn-text)",
    label: "タイムアウト",
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

/** チャート用の週間データ */
const WEEKLY_DATA = [
  { day: "Mon", requests: 180, blocked: 2 },
  { day: "Tue", requests: 210, blocked: 1 },
  { day: "Wed", requests: 245, blocked: 3 },
  { day: "Thu", requests: 220, blocked: 0 },
  { day: "Fri", requests: 268, blocked: 1 },
  { day: "Sat", requests: 84, blocked: 0 },
  { day: "Sun", requests: 62, blocked: 0 },
];

/** チャートツールチップ */
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
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
      <p style={{ color: "var(--text-muted)" }}>{label}</p>
      <p style={{ color: "var(--text-primary)" }}>
        {payload[0]?.value} リクエスト
      </p>
    </div>
  );
};

export const Dashboard = (): JSX.Element => {
  const approvedTools = TOOLS.filter((t) => t.approved);
  const pendingCount = TOOLS.filter((t) => !t.approved).length;
  const totalRequests = approvedTools.reduce(
    (sum, t) => sum + t.stats.requests,
    0,
  );
  const blockedCount = HISTORY.filter((h) => h.status === "blocked").length;

  // よく使うツール（リクエスト数上位4つ）
  const favoriteTools = [...approvedTools]
    .sort((a, b) => b.stats.requests - a.stats.requests)
    .slice(0, 4);

  // 最近の操作（上位5件）
  const recentHistory = HISTORY.slice(0, 5);

  // KPIカード定義
  const kpiCards = [
    {
      label: "利用可能ツール",
      value: approvedTools.length,
      sub: `全${TOOLS.length}件中`,
      icon: Wrench,
    },
    {
      label: "今月のリクエスト数",
      value: totalRequests.toLocaleString(),
      sub: "今月累計",
      icon: Zap,
    },
    {
      label: "ブロック",
      value: blockedCount,
      sub: "要確認",
      icon: ShieldAlert,
    },
    {
      label: "申請中",
      value: pendingCount,
      sub: "承認待ち",
      icon: FileText,
    },
  ];

  return (
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 挨拶ヘッダー */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          おはようございます、{CURRENT_USER.name.replace("太郎", "")}さん
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {CURRENT_USER.department} / {CURRENT_USER.role} ロール
        </p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {card.label}
              </span>
              <card.icon
                className="h-4 w-4"
                style={{ color: "var(--text-subtle)" }}
              />
            </div>
            <div
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
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

      {/* リクエスト推移チャート */}
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
            リクエスト推移（今週）
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
            7日間
          </span>
        </div>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={WEEKLY_DATA}>
              <defs>
                <linearGradient id="gRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--badge-success-text)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--badge-success-text)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--text-subtle)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="var(--badge-success-text)"
                strokeWidth={1.5}
                fill="url(#gRequests)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2カラム: よく使うツール + 最近の操作 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* よく使うツール */}
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
              よく使うツール
            </span>
            <Link
              to="/tools"
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--text-subtle)" }}
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {favoriteTools.map((tool) => (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="flex items-center gap-3 rounded-lg p-2.5 transition-colors"
                style={{ backgroundColor: "var(--bg-app)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--bg-card-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-app)";
                }}
              >
                {/* イニシャルアバター */}
                <div
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--bg-active)",
                    color: "var(--text-primary)",
                  }}
                >
                  {tool.name.charAt(0)}
                  <span
                    className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${statusDotColor[tool.status]}`}
                  />
                </div>
                {/* ツール名 + リクエスト数 */}
                <div className="flex flex-1 items-center justify-between">
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tool.name}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {tool.stats.requests.toLocaleString()} req
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 最近の操作 */}
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
              最近の操作
            </span>
            <Link
              to="/history"
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--text-subtle)" }}
            >
              すべて見る
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentHistory.map((item) => {
              const badge = statusBadgeStyle[item.status] ?? {
                bg: "var(--badge-error-bg)",
                text: "var(--badge-error-text)",
                label: "エラー",
              };
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.datetime}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.tool}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.operation}
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* お知らせ */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
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
            <div
              key={a.id}
              className="flex items-start justify-between text-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {a.date}
                </span>
                {a.link ? (
                  <Link
                    to={a.link}
                    className="text-sm transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                  >
                    {a.message}
                  </Link>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>
                    {a.message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
