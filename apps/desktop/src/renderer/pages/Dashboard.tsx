import { useState } from "react";
import type { JSX } from "react";
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
  { name: "Cursor", logo: "/logos/ai-clients/cursor.webp" },
  { name: "ChatGPT", logo: "/logos/ai-clients/chatgpt.webp" },
  { name: "Claude", logo: "/logos/ai-clients/claude.webp" },
  { name: "Copilot", logo: "/logos/ai-clients/copilot.webp" },
  { name: "Cline", logo: "/logos/ai-clients/cline.webp" },
  { name: "Antigravity", logo: "/logos/ai-clients/antigravity.webp" },
];

/* ---------- 接続先サービス ---------- */

const SERVICES = [
  {
    name: "GitHub",
    logo: "/logos/services/github.webp",
    status: "active",
    requests: 3420,
  },
  {
    name: "Notion",
    logo: "/logos/services/notion.webp",
    status: "active",
    requests: 2810,
  },
  {
    name: "Figma",
    logo: "/logos/services/figma.webp",
    status: "active",
    requests: 1960,
  },
  {
    name: "Google Drive",
    logo: "/logos/services/google-drive.svg",
    status: "active",
    requests: 1340,
  },
  {
    name: "Slack",
    logo: "/logos/services/slack.webp",
    status: "active",
    requests: 1120,
  },
  {
    name: "PostgreSQL",
    logo: "/logos/services/postgresql.webp",
    status: "active",
    requests: 890,
  },
  {
    name: "Sentry",
    logo: "/logos/services/sentry.webp",
    status: "idle",
    requests: 340,
  },
  {
    name: "Microsoft Teams",
    logo: "/logos/services/microsoft-teams.webp",
    status: "active",
    requests: 780,
  },
  {
    name: "OneDrive",
    logo: "/logos/services/one-drive.webp",
    status: "active",
    requests: 620,
  },
  {
    name: "Playwright",
    logo: "/logos/services/playwright.webp",
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

/* ---------- メインコンポーネント ---------- */

export const Dashboard = (): JSX.Element => {
  const [period, setPeriod] = useState<Period>("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);
  const stats = PERIOD_STATS[period];

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

      {/* 2カラム下段 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左: AIクライアント別ドーナツチャート + 構成比テーブル + バッジ */}
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
            AIクライアント別構成比
          </span>

          {/* ドーナツチャート */}
          <div className="flex items-center justify-center">
            <div className="h-[160px] w-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={AI_PIE}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
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
          </div>

          {/* 構成比テーブル */}
          <div className="mt-4 space-y-2">
            {AI_PIE.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    {item.name}
                  </span>
                </div>
                <span
                  className="font-mono"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {item.value}%
                </span>
              </div>
            ))}
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
                  src={ai.logo}
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
                <img src={s.logo} alt={s.name} className="h-4 w-4 rounded" />
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
    </div>
  );
};
