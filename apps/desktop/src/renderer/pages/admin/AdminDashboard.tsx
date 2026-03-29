import { useState } from "react";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity, ArrowRight, Megaphone } from "lucide-react";
import { themeAtom } from "../../store/atoms";
import { HISTORY, ANNOUNCEMENTS, type HistoryStatus } from "../../data/mock";
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

/* ---------- 期間別トラフィックデータ ---------- */

const TRAFFIC_24H = [
  {
    time: "00:00",
    cursor: 180,
    chatgpt: 100,
    claude: 420,
    copilot: 90,
    cline: 680,
    ag: 60,
  },
  {
    time: "04:00",
    cursor: 80,
    chatgpt: 40,
    claude: 350,
    copilot: 50,
    cline: 920,
    ag: 30,
  },
  {
    time: "08:00",
    cursor: 3200,
    chatgpt: 800,
    claude: 1100,
    copilot: 2400,
    cline: 320,
    ag: 180,
  },
  {
    time: "10:00",
    cursor: 4800,
    chatgpt: 1600,
    claude: 1300,
    copilot: 3600,
    cline: 280,
    ag: 240,
  },
  {
    time: "12:00",
    cursor: 3100,
    chatgpt: 2400,
    claude: 1200,
    copilot: 1800,
    cline: 350,
    ag: 320,
  },
  {
    time: "14:00",
    cursor: 2600,
    chatgpt: 3800,
    claude: 1400,
    copilot: 2200,
    cline: 420,
    ag: 480,
  },
  {
    time: "16:00",
    cursor: 2900,
    chatgpt: 4200,
    claude: 1350,
    copilot: 2000,
    cline: 580,
    ag: 720,
  },
  {
    time: "18:00",
    cursor: 1800,
    chatgpt: 2800,
    claude: 1100,
    copilot: 1200,
    cline: 900,
    ag: 980,
  },
  {
    time: "20:00",
    cursor: 900,
    chatgpt: 1200,
    claude: 980,
    copilot: 600,
    cline: 1800,
    ag: 540,
  },
  {
    time: "22:00",
    cursor: 400,
    chatgpt: 600,
    claude: 750,
    copilot: 300,
    cline: 2400,
    ag: 280,
  },
];

const TRAFFIC_7D = [
  {
    time: "Mon",
    cursor: 18200,
    chatgpt: 14800,
    claude: 9800,
    copilot: 11200,
    cline: 6400,
    ag: 3200,
  },
  {
    time: "Tue",
    cursor: 21400,
    chatgpt: 16200,
    claude: 10500,
    copilot: 12800,
    cline: 7100,
    ag: 3800,
  },
  {
    time: "Wed",
    cursor: 24600,
    chatgpt: 19800,
    claude: 11200,
    copilot: 14200,
    cline: 5800,
    ag: 4200,
  },
  {
    time: "Thu",
    cursor: 22100,
    chatgpt: 21400,
    claude: 10800,
    copilot: 13600,
    cline: 8200,
    ag: 3600,
  },
  {
    time: "Fri",
    cursor: 26800,
    chatgpt: 18600,
    claude: 12400,
    copilot: 15800,
    cline: 9400,
    ag: 5100,
  },
  {
    time: "Sat",
    cursor: 8400,
    chatgpt: 12200,
    claude: 7600,
    copilot: 4200,
    cline: 11800,
    ag: 6800,
  },
  {
    time: "Sun",
    cursor: 6200,
    chatgpt: 9800,
    claude: 6400,
    copilot: 3100,
    cline: 13200,
    ag: 7200,
  },
];

const TRAFFIC_30D = [
  {
    time: "W1",
    cursor: 82000,
    chatgpt: 56000,
    claude: 42000,
    copilot: 48000,
    cline: 28000,
    ag: 14000,
  },
  {
    time: "W2",
    cursor: 94000,
    chatgpt: 68000,
    claude: 48000,
    copilot: 52000,
    cline: 32000,
    ag: 18000,
  },
  {
    time: "W3",
    cursor: 108000,
    chatgpt: 82000,
    claude: 54000,
    copilot: 58000,
    cline: 38000,
    ag: 22000,
  },
  {
    time: "W4",
    cursor: 124000,
    chatgpt: 98000,
    claude: 62000,
    copilot: 64000,
    cline: 44000,
    ag: 28000,
  },
];

const TRAFFIC_MAP = {
  "24h": TRAFFIC_24H,
  "7d": TRAFFIC_7D,
  "30d": TRAFFIC_30D,
} as const;

/* ---------- AIクライアント構成比 ---------- */

const AI_PIE = [
  { name: "Cursor", value: 30, color: "#fff" },
  { name: "ChatGPT", value: 22, color: "#10a37f" },
  { name: "Claude", value: 18, color: "#DA704E" },
  { name: "Copilot", value: 14, color: "#2b88d8" },
  { name: "Cline", value: 10, color: "#71717a" },
  { name: "AG", value: 6, color: "#a855f7" },
];

/* ---------- AIクライアントロゴ ---------- */

const AI_CLIENTS = [
  {
    name: "Cursor",
    dark: "/logos/ai-clients/cursor.webp",
    light: "/logos/ai-clients/cursor.svg",
  },
  {
    name: "ChatGPT",
    dark: "/logos/ai-clients/chatgpt.webp",
    light: "/logos/ai-clients/chatgpt.svg",
  },
  {
    name: "Claude",
    dark: "/logos/ai-clients/claude.webp",
    light: "/logos/ai-clients/claude.svg",
  },
  {
    name: "Copilot",
    dark: "/logos/ai-clients/copilot.webp",
    light: "/logos/ai-clients/copilot.svg",
  },
  {
    name: "Cline",
    dark: "/logos/ai-clients/cline.webp",
    light: "/logos/ai-clients/cline.svg",
  },
  {
    name: "Antigravity",
    dark: "/logos/ai-clients/antigravity.webp",
    light: "/logos/ai-clients/antigravity.svg",
  },
];

/* ---------- 接続先サービス ---------- */

const SERVICES = [
  {
    name: "GitHub",
    dark: "/logos/services/github_white.svg",
    light: "/logos/services/github_black.svg",
    status: "active",
    requests: 3420,
  },
  {
    name: "Notion",
    dark: "/logos/services/notion.webp",
    light: "/logos/services/notion.webp",
    status: "active",
    requests: 2810,
  },
  {
    name: "Figma",
    dark: "/logos/services/figma.webp",
    light: "/logos/services/figma.webp",
    status: "active",
    requests: 1960,
  },
  {
    name: "Google Drive",
    dark: "/logos/services/google-drive.svg",
    light: "/logos/services/google-drive.svg",
    status: "active",
    requests: 1340,
  },
  {
    name: "Slack",
    dark: "/logos/services/slack.webp",
    light: "/logos/services/slack.webp",
    status: "active",
    requests: 1120,
  },
  {
    name: "PostgreSQL",
    dark: "/logos/services/postgresql.webp",
    light: "/logos/services/postgresql.webp",
    status: "active",
    requests: 890,
  },
  {
    name: "Sentry",
    dark: "/logos/services/sentry.webp",
    light: "/logos/services/sentry.webp",
    status: "idle",
    requests: 340,
  },
  {
    name: "Microsoft Teams",
    dark: "/logos/services/microsoft-teams.webp",
    light: "/logos/services/microsoft-teams.webp",
    status: "active",
    requests: 780,
  },
  {
    name: "OneDrive",
    dark: "/logos/services/one-drive.webp",
    light: "/logos/services/one-drive.webp",
    status: "active",
    requests: 620,
  },
  {
    name: "Playwright",
    dark: "/logos/services/playwright.webp",
    light: "/logos/services/playwright.webp",
    status: "idle",
    requests: 210,
  },
] as const;

/* ---------- 期間別KPIデータ ---------- */

const PERIOD_STATS = {
  "24h": {
    requests: "12,847",
    requestsSub: "+12.4% 前日比",
    blocks: "47",
    blocksSub: "0.37%",
    users: "156",
    usersSub: "+3 今日",
  },
  "7d": {
    requests: "89,420",
    requestsSub: "+8.2% 前週比",
    blocks: "312",
    blocksSub: "0.35%",
    users: "284",
    usersSub: "+18 今週",
  },
  "30d": {
    requests: "342,800",
    requestsSub: "+22.6% 前月比",
    blocks: "1,247",
    blocksSub: "0.36%",
    users: "412",
    usersSub: "+67 今月",
  },
} as const;

/* ---------- チャート凡例定義 ---------- */

const CHART_LEGENDS = [
  { label: "Cursor", key: "cursor", color: "#fff" },
  { label: "ChatGPT", key: "chatgpt", color: "#10a37f" },
  { label: "Claude", key: "claude", color: "#DA704E" },
  { label: "Copilot", key: "copilot", color: "#2b88d8" },
  { label: "Cline", key: "cline", color: "#71717a" },
  { label: "AG", key: "ag", color: "#a855f7" },
] as const;

/* ---------- 期間選択肢 ---------- */

type Period = "24h" | "7d" | "30d";
const PERIODS: readonly Period[] = ["24h", "7d", "30d"] as const;

/* ---------- サービスの最大リクエスト数 ---------- */

const maxServiceRequests = Math.max(...SERVICES.map((s) => s.requests));

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

/* ---------- 操作履歴ステータスバッジ ---------- */

const statusBadge = (
  status: HistoryStatus,
): { bg: string; text: string; label: string } => {
  const config = {
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
  return config[status];
};

/** 行がエラー系かどうか判定 */
const isErrorRow = (status: HistoryStatus): boolean =>
  status === "blocked" || status === "error";

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

        {/* 接続 MCP */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            接続 MCP
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
                      width: `${(s.requests / maxServiceRequests) * 100}%`,
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

      {/* MCPツール呼び出しログ + お知らせ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.4fr]">
        {/* MCPツール呼び出しログ（LP風フルテーブル） */}
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
                MCPツール呼び出しログ
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
