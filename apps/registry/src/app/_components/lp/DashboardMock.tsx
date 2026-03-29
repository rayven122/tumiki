"use client";

import { useState } from "react";
import {
  Activity,
  Layout,
  type LucideIcon,
  Server,
  Shield,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
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
  AI_CLIENTS,
  AI_PIE_MAP,
  type AiPieEntry,
  PERIOD_STATS,
  SERVICES_24H,
  SERVICES_MAP,
  TRAFFIC_MAP,
} from "./dashboard-data";

/* ===== 共通コンポーネント ===== */

const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  valueColor = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  valueColor?: string;
}) => (
  <div className="rounded-lg bg-white/[0.03] p-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-zinc-600">{label}</span>
      <Icon className="h-3 w-3 text-zinc-700" />
    </div>
    <div className={`mt-1 text-xl font-semibold ${valueColor}`}>{value}</div>
    {sub && <div className="mt-0.5 text-[10px] text-zinc-500">{sub}</div>}
  </div>
);

/* ドーナツチャート（Recharts） */
const DonutChart = ({ data }: { data: AiPieEntry[] }) => (
  <div className="h-[120px] w-[120px] shrink-0">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={34}
          outerRadius={54}
          dataKey="value"
          stroke="none"
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const CustomTooltip = ({
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
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 text-zinc-400">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-white">
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

/* ===== OverviewView ===== */

const OverviewView = ({
  period,
  activeAi,
  setActiveAi,
}: {
  period: string;
  activeAi: string | null;
  setActiveAi: (ai: string | null) => void;
}) => {
  const stats =
    PERIOD_STATS[period as keyof typeof PERIOD_STATS] ?? PERIOD_STATS["24h"];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`リクエスト / ${period}`}
          value={stats.requests}
          sub={stats.requestsSub}
          icon={Zap}
        />
        <StatCard
          label="ブロック"
          value={stats.blocks}
          sub={stats.blocksSub}
          icon={ShieldAlert}
          valueColor="text-red-400"
        />
        <StatCard label="接続 MCP" value="8" sub="5 稼働中" icon={Server} />
        <StatCard
          label="ユーザー"
          value={stats.users}
          sub={stats.usersSub}
          icon={Users}
        />
      </div>

      {/* AIクライアント別リクエスト推移 */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400">
            AIクライアント別リクエスト推移
          </span>
          <div className="flex flex-wrap gap-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
              Cursor
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
              ChatGPT
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#DA704E]" />
              Claude
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2b88d8]" />
              Copilot
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
              Cline
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a855f7]" />
              AG
            </span>
          </div>
        </div>
        <div className="h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={
                TRAFFIC_MAP[period as keyof typeof TRAFFIC_MAP] ??
                TRAFFIC_MAP["24h"]
              }
            >
              <defs>
                <linearGradient id="gCursor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gChatgpt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10a37f" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10a37f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gClaude" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DA704E" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#DA704E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717a" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCopilot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2b88d8" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#2b88d8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gArc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "#52525b", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <Area
                type="monotone"
                dataKey="cursor"
                stroke="#fff"
                strokeWidth={1.5}
                fill="url(#gCursor)"
                name="Cursor"
                strokeOpacity={
                  activeAi === null || activeAi === "Cursor" ? 1 : 0.1
                }
                fillOpacity={
                  activeAi === null || activeAi === "Cursor" ? 1 : 0.05
                }
              />
              <Area
                type="monotone"
                dataKey="chatgpt"
                stroke="#10a37f"
                strokeWidth={1.2}
                fill="url(#gChatgpt)"
                name="ChatGPT"
                strokeOpacity={
                  activeAi === null || activeAi === "ChatGPT" ? 1 : 0.1
                }
                fillOpacity={
                  activeAi === null || activeAi === "ChatGPT" ? 1 : 0.05
                }
              />
              <Area
                type="monotone"
                dataKey="claude"
                stroke="#DA704E"
                strokeWidth={1}
                fill="url(#gClaude)"
                name="Claude"
                strokeOpacity={
                  activeAi === null || activeAi === "Claude" ? 1 : 0.1
                }
                fillOpacity={
                  activeAi === null || activeAi === "Claude" ? 1 : 0.05
                }
              />
              <Area
                type="monotone"
                dataKey="cline"
                stroke="#71717a"
                strokeWidth={1}
                fill="url(#gCline)"
                name="Cline"
                strokeOpacity={
                  activeAi === null || activeAi === "Cline" ? 1 : 0.1
                }
                fillOpacity={
                  activeAi === null || activeAi === "Cline" ? 1 : 0.05
                }
              />
              <Area
                type="monotone"
                dataKey="copilot"
                stroke="#2b88d8"
                strokeWidth={1}
                fill="url(#gCopilot)"
                name="Copilot"
                strokeOpacity={
                  activeAi === null || activeAi === "Copilot" ? 1 : 0.1
                }
                fillOpacity={
                  activeAi === null || activeAi === "Copilot" ? 1 : 0.05
                }
              />
              <Area
                type="monotone"
                dataKey="ag"
                stroke="#a855f7"
                strokeWidth={1}
                fill="url(#gArc)"
                name="Antigravity"
                strokeOpacity={
                  activeAi === null || activeAi === "Antigravity" ? 1 : 0.1
                }
                fillOpacity={
                  activeAi === null || activeAi === "Antigravity" ? 1 : 0.05
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AIクライアント別 + 接続先 */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* 左カラム: AIクライアント別 + バッジ */}
        <div className="space-y-2">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-2 text-[11px] font-medium text-zinc-400">
              AIクライアント別
            </div>
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <DonutChart
                  data={
                    AI_PIE_MAP[period as keyof typeof AI_PIE_MAP] ??
                    AI_PIE_MAP["24h"]
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {(
                  AI_PIE_MAP[period as keyof typeof AI_PIE_MAP] ??
                  AI_PIE_MAP["24h"]
                ).map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-1 text-[10px]"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-zinc-400">{p.name}</span>
                    <span className="ml-auto text-zinc-600">{p.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AIクライアント */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="mb-2 text-[11px] font-medium text-zinc-400">
              AIクライアント
            </div>
            <div className="flex flex-wrap gap-2">
              {AI_CLIENTS.map((ai) => (
                <button
                  key={ai.name}
                  onClick={() =>
                    setActiveAi(activeAi === ai.name ? null : ai.name)
                  }
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 transition ${
                    activeAi === null || activeAi === ai.name
                      ? "bg-white/[0.08] text-zinc-300"
                      : "bg-white/[0.02] text-zinc-600 opacity-50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ai.logo}
                    alt={ai.name}
                    className={`h-3.5 w-3.5 rounded ${ai.invert ? "invert" : ""}`}
                  />
                  <span className="text-[10px] whitespace-nowrap">
                    {ai.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MCPサーバー（実ロゴ） */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-3 text-[11px] font-medium text-zinc-400">
            接続先
          </div>
          <div className="space-y-2">
            {(() => {
              const services =
                SERVICES_MAP[period as keyof typeof SERVICES_MAP] ??
                SERVICES_MAP["24h"];
              const maxRequests = Math.max(...services.map((s) => s.requests));
              return services.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center gap-2.5 text-xs"
                  style={{
                    animation: `fade-in 0.5s ease-out ${0.5 + i * 0.12}s both`,
                  }}
                >
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logo}
                      alt={s.name}
                      className={`h-4 w-4 rounded ${s.invert ? "invert" : ""}`}
                    />
                  ) : (
                    <Server className="h-4 w-4 text-zinc-600" />
                  )}
                  <span className="w-20 text-zinc-300">{s.name}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : "bg-zinc-700"}`}
                  />
                  <div className="h-1.5 flex-1 rounded-full bg-white/[0.06]">
                    <div
                      className="h-1.5 rounded-full bg-white/20"
                      style={{
                        width: `${(s.requests / maxRequests) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-zinc-600">
                    {s.requests.toLocaleString()}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== メインコンポーネント ===== */

const DashboardMock = () => {
  const [period, setPeriod] = useState("24h");
  const [activeAi, setActiveAi] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl shadow-[0_0_120px_rgba(255,255,255,0.03)]">
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111] shadow-2xl shadow-white/[0.03]">
        {/* ウィンドウバー */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            </div>
            <span className="ml-2 text-xs text-zinc-600">
              tumiki — dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* 期間切替 */}
            <div className="flex items-center gap-1 rounded-md bg-white/[0.04] p-0.5">
              {(["24h", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded px-2 py-0.5 text-[10px] transition ${
                    period === p
                      ? "bg-white/[0.12] text-white"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] text-zinc-600">Connected</span>
            </div>
          </div>
        </div>

        {/* ダッシュボード本体 */}
        <div className="grid min-h-[460px] grid-cols-1 md:grid-cols-[180px_1fr]">
          {/* サイドバー */}
          <div className="hidden border-r border-white/[0.06] p-3 md:block">
            {/* MCPサーバーステータス */}
            <div className="mb-1 px-2 text-[10px] font-medium tracking-wider text-zinc-600 uppercase">
              接続先
            </div>
            <div className="space-y-0.5">
              {SERVICES_24H.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-zinc-500"
                  style={{
                    animation: `fade-in 0.4s ease-out ${i * 0.05}s both`,
                  }}
                >
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logo}
                      alt={s.name}
                      className={`h-3.5 w-3.5 rounded-sm ${s.invert ? "invert" : ""}`}
                    />
                  ) : (
                    <Server className="h-3.5 w-3.5 text-zinc-700" />
                  )}
                  <span className="flex-1">{s.name}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-400" : "bg-zinc-700"}`}
                  />
                </div>
              ))}
            </div>

            {/* ナビゲーション */}
            <div className="mt-4 mb-1 px-2 text-[10px] font-medium tracking-wider text-zinc-600 uppercase">
              Views
            </div>
            <div className="space-y-0.5">
              {[
                { id: "overview", label: "概要", icon: Layout },
                { id: "logs", label: "ログ", icon: Activity },
                { id: "access", label: "アクセス制御", icon: Shield },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${
                      item.id === "overview"
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-500"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="overflow-y-auto p-4 md:p-5">
            <OverviewView
              period={period}
              activeAi={activeAi}
              setActiveAi={setActiveAi}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMock;
