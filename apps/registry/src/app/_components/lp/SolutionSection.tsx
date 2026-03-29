import {
  BarChart3,
  Cloud,
  Database,
  Lock,
  Monitor,
  Server,
  Settings,
  Shield,
  Workflow,
} from "lucide-react";

import AnimateIn from "./AnimateIn";

/** 左パネルの2x2グリッド用データ */
const customerComponents = [
  {
    icon: Shield,
    title: "MCP Gateway",
    sub: "認証・監査・制御",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Server,
    title: "MCPサーバー群",
    sub: "Slack / GitHub / DB",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-500/20",
  },
  {
    icon: Database,
    title: "監査ログDB",
    sub: "全証跡を暗号化保存",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-500/20",
  },
  {
    icon: Lock,
    title: "Keycloak",
    sub: "JWT / OAuth 2.1",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-500/20",
  },
] as const;

/** 右パネルの機能カード用データ */
const controlPlaneFeatures = [
  {
    icon: Settings,
    title: "ポリシー管理",
    sub: "ロール・権限をGUIで設定",
  },
  {
    icon: Workflow,
    title: "ツールカタログ",
    sub: "MCP配布・Description上書き・統合",
  },
  {
    icon: BarChart3,
    title: "統計ダッシュボード",
    sub: "AIクライアント別・SaaS別分析",
  },
] as const;

/** 同期データラベル */
const syncLabels = ["ポリシー ✓", "メタデータ ✓", "匿名統計 ✓"];

const SolutionSection = () => {
  return (
    <section
      id="solution"
      className="relative border-t border-white/[0.08] bg-[#0a0a0a] py-24 md:py-32"
    >
      {/* 背景グロー */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-emerald-500/[0.02] blur-[150px]" />
        <div className="absolute top-1/2 right-1/4 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-white/[0.01] blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5">
        <AnimateIn>
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-white md:text-5xl">
            データは社内に。
            <span className="text-zinc-500">管理はクラウドで。</span>
          </h2>
        </AnimateIn>

        {/* フルワイドのアーキテクチャ図 */}
        <AnimateIn delay={0.1}>
          <div className="mx-auto mt-16 max-w-6xl">
            <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[1fr_100px_1fr]">
              {/* ===== 左: 顧客環境 ===== */}
              <div className="relative rounded-t-2xl border border-white/[0.08] bg-gradient-to-br from-[#0f1210] to-[#0a0a0a] p-6 lg:rounded-l-2xl lg:rounded-tr-none">
                {/* ヘッダー */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10">
                      <Monitor className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        顧客環境
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        オンプレミス / VPC
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[9px] text-emerald-400">
                      Protected
                    </span>
                  </div>
                </div>

                {/* コンポーネントグリッド 2x2 */}
                <div className="grid grid-cols-2 gap-2">
                  {customerComponents.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className={`rounded-xl border ${item.border} bg-white/[0.02] p-3 transition-all hover:bg-white/[0.04]`}
                      >
                        <div
                          className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${item.bg}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                        </div>
                        <div className="text-xs font-medium text-white">
                          {item.title}
                        </div>
                        <div className="text-[9px] text-zinc-600">
                          {item.sub}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* データ保護バッジ */}
                <div className="mt-4 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5 text-center">
                  <div className="text-[10px] font-medium text-emerald-400">
                    機密データは社外に出ない
                  </div>
                  <div className="mt-0.5 flex justify-center gap-3 text-[8px] text-zinc-600">
                    <span>プロンプト ✕</span>
                    <span>APIキー ✕</span>
                    <span>PII ✕</span>
                  </div>
                </div>
              </div>

              {/* ===== 中央: データフロー ===== */}
              <div className="flex items-center justify-center border-x-0 border-y border-white/[0.08] bg-[#080808] py-6 lg:border-x lg:border-y-0 lg:px-2 lg:py-0">
                <div className="flex flex-col items-center gap-3 lg:gap-4">
                  {/* 上の線: 統計送信（左→右） */}
                  <div className="relative flex items-center">
                    {/* モバイル: 縦線 */}
                    <div className="h-10 w-px bg-gradient-to-b from-emerald-400/20 to-emerald-400/5 lg:hidden" />
                    {/* PC: 横線 */}
                    <div className="hidden h-px w-14 bg-gradient-to-r from-emerald-400/30 to-emerald-400/10 lg:block" />
                    {/* 流れるドット */}
                    <div className="absolute inset-0 overflow-hidden">
                      {/* モバイル用（縦） */}
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.6)] lg:hidden"
                        style={{
                          animation: "flow-down 2s ease-in-out infinite",
                        }}
                      />
                      {/* PC用（横） */}
                      <div
                        className="hidden h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.6)] lg:block"
                        style={{
                          animation: "flow-right 2s ease-in-out infinite",
                        }}
                      />
                    </div>
                  </div>
                  <div className="font-mono text-[7px] text-emerald-400/60">
                    統計 →
                  </div>

                  {/* HTTPS バッジ */}
                  <div className="rounded-full border border-white/[0.1] bg-[#0a0a0a] px-3 py-1">
                    <span className="text-[8px] font-medium text-zinc-400">
                      HTTPS
                    </span>
                  </div>

                  {/* 同期データ */}
                  <div className="space-y-0.5 text-center">
                    {syncLabels.map((s) => (
                      <div key={s} className="text-[7px] text-emerald-400/50">
                        {s}
                      </div>
                    ))}
                  </div>

                  {/* 下の線: ポリシー受信（右→左） */}
                  <div className="relative flex items-center">
                    <div className="h-10 w-px bg-gradient-to-t from-white/15 to-white/5 lg:hidden" />
                    <div className="hidden h-px w-14 bg-gradient-to-l from-white/20 to-white/5 lg:block" />
                    <div className="absolute inset-0 overflow-hidden">
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_6px_rgba(255,255,255,0.3)] lg:hidden"
                        style={{
                          animation: "flow-up 2.5s ease-in-out 0.5s infinite",
                        }}
                      />
                      <div
                        className="hidden h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_6px_rgba(255,255,255,0.3)] lg:block"
                        style={{
                          animation: "flow-left 2.5s ease-in-out 0.5s infinite",
                        }}
                      />
                    </div>
                  </div>
                  <div className="font-mono text-[7px] text-zinc-600">
                    ← ポリシー
                  </div>
                </div>
              </div>

              {/* ===== 右: Control Plane ===== */}
              <div className="relative rounded-b-2xl border border-t-0 border-white/[0.08] bg-gradient-to-bl from-[#10101a] to-[#0a0a0a] p-6 lg:rounded-r-2xl lg:rounded-bl-none lg:border-t lg:border-l-0">
                {/* ヘッダー */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                      <Cloud className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        Tumiki Control Plane
                      </div>
                      <div className="text-[10px] text-zinc-600">SaaS</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                    <span className="text-[9px] text-zinc-500">Cloud</span>
                  </div>
                </div>

                {/* 機能カード */}
                <div className="space-y-2">
                  {controlPlaneFeatures.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.05]"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">
                            {item.title}
                          </div>
                          <div className="text-[9px] text-zinc-600">
                            {item.sub}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* クラウドバッジ */}
                <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                  <div className="text-[10px] text-zinc-500">
                    ポリシーとメタデータのみ管理
                  </div>
                  <div className="mt-0.5 flex justify-center gap-3 text-[8px] text-zinc-700">
                    <span>ペイロード保存 ✕</span>
                    <span>ログ保存 ✕</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
};

export default SolutionSection;
