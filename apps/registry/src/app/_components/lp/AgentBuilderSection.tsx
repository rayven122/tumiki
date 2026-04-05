import { Bot, Briefcase, Code, Headphones, Search, Sparkles } from "lucide-react";

import AnimateIn from "./AnimateIn";

const TOOLS = [
  {
    service: "GitHub",
    logo: "/logos/services/github.webp",
    tool: "list_issues",
    original: "List issues in a repository",
    override:
      "進捗・残タスク・ブロッカーの質問で呼び出す。assignee・labelでフィルタし完了率を返す。PRの話題ではget_pull_requestsを使うこと。",
  },
  {
    service: "Notion",
    logo: "/logos/services/notion.webp",
    tool: "search_pages",
    original: "Search for pages in the workspace",
    override:
      "仕様・決定事項・過去の議論の確認で呼び出す。「スプリント」「議事録」タグを優先検索。結果が0件なら検索語を広げて再試行。",
  },
  {
    service: "Slack",
    logo: "/logos/services/slack.webp",
    tool: "send_message",
    original: "Send a message to a channel",
    override:
      "チームへの共有・リマインドで呼び出す。送信先は #dev 限定。遅延タスクの担当者には @mention 必須。DM送信は禁止。",
  },
] as const;

const AI_CLIENTS = [
  { name: "Cursor", logo: "/logos/ai-clients/cursor.webp", on: true },
  { name: "ChatGPT", logo: "/logos/ai-clients/chatgpt.webp", on: true },
  { name: "Claude", logo: "/logos/ai-clients/claude.webp", on: true },
  { name: "Copilot", logo: "/logos/ai-clients/copilot.webp", on: false },
] as const;

const OTHER_EXAMPLES = [
  {
    Icon: Headphones,
    name: "カスタマーサポート",
    desc: "問い合わせをFAQと照合し、回答ドラフトを自動生成",
  },
  {
    Icon: Search,
    name: "社内ナレッジ検索",
    desc: "Notion・Drive・Confluenceを横断検索して質問に回答",
  },
  {
    Icon: Briefcase,
    name: "セールスアシスタント",
    desc: "顧客情報と過去のやりとりを集約し、商談準備を支援",
  },
  {
    Icon: Code,
    name: "開発アシスタント",
    desc: "設計ドキュメントとデザインを踏まえてコーディングを支援",
  },
] as const;

const AgentBuilderSection = () => {
  return (
    <section className="border-t border-white/[0.08] bg-[#08080a] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        {/* ヘッダー */}
        <AnimateIn>
          <p className="mb-3 font-mono text-xs font-medium tracking-widest text-zinc-500 uppercase">
            Agent Builder
          </p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            ツールを組み合わせて、
            <br />
            <span className="text-emerald-400">専用エージェントを構築</span>
          </h2>
          <p className="mt-5 max-w-xl text-zinc-400">
            必要なツールを自動で選択し、Descriptionを業務に最適化。AIが正確に動く仮想MCPをノーコードで作成できます。
          </p>
        </AnimateIn>

        {/* ===== メインパネル ===== */}
        <AnimateIn delay={0.1}>
          <div className="mt-14 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]">
            {/* ── Step 1: プロンプト入力 ── */}
            <div className="border-b border-white/[0.06] p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  1
                </span>
                <span className="text-xs font-medium text-white">
                  業務を説明する
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                    <span className="text-[10px] font-medium text-zinc-300">
                      Y
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    &quot;うちのチームのGitHubとNotionとSlackを見て、進捗確認・タスク整理・メンバーへの連絡ができるようにして&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* ── Step 2: ツール選択 + Description最適化 + Skills生成 ── */}
            <div className="border-b border-white/[0.06]">
              <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    2
                  </span>
                  <span className="text-xs font-medium text-white">
                    ツール選択 &amp; Description最適化
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400/60" />
                </div>
                <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-400">
                  3 tools 選択
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-white/[0.04] md:grid-cols-3 md:divide-x md:divide-y-0">
                {TOOLS.map((t, i) => (
                  // インデックスごとに異なるdelayを動的に算出するため、インラインスタイルを使用
                  <div
                    key={t.tool}
                    className="px-6 py-4"
                    style={{
                      animation: `fade-in 0.4s ease-out ${i * 0.08}s both`,
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <img
                        src={t.logo}
                        alt={t.service}
                        className="h-5 w-5"
                      />
                      <span className="font-mono text-xs font-medium text-white">
                        {t.service}/{t.tool}
                      </span>
                    </div>
                    <div className="mb-2 font-mono text-[10px] text-zinc-600 line-through">
                      {t.original}
                    </div>
                    <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] px-3 py-2">
                      <div className="text-[11px] leading-relaxed text-zinc-200">
                        {t.override}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Step 3: 仮想MCP → AI配信 ── */}
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  3
                </span>
                <span className="text-xs font-medium text-white">
                  エージェント完成 → AIに配信
                </span>
              </div>

              <div className="flex flex-col items-center gap-5 md:flex-row">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                    <Bot className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="mb-0.5 text-[9px] font-medium tracking-wider text-emerald-400/60 uppercase">
                      仮想MCP
                    </div>
                    <div className="font-mono text-sm font-medium text-white">
                      project_manager
                    </div>
                    <div className="mt-1 flex gap-1">
                      {["list_issues", "search", "send"].map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-zinc-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-zinc-700">
                  <span className="hidden text-lg md:inline">→</span>
                  <span className="text-lg md:hidden">↓</span>
                </div>

                <div className="flex flex-1 flex-wrap gap-2">
                  {AI_CLIENTS.map((ai) => (
                    <div
                      key={ai.name}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 ${ai.on ? "border border-emerald-500/20 bg-emerald-500/[0.03]" : "border border-white/[0.04] bg-white/[0.01]"}`}
                    >
                      <img
                        src={ai.logo}
                        alt={ai.name}
                        className="h-4 w-4"
                      />
                      <span
                        className={`text-[11px] ${ai.on ? "text-white" : "text-zinc-600"}`}
                      >
                        {ai.name}
                      </span>
                      {ai.on && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* ===== 他の活用例 ===== */}
        <AnimateIn delay={0.2}>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {OTHER_EXAMPLES.map((ex) => {
              const IconComponent = ex.Icon;
              return (
                <div
                  key={ex.name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                    <IconComponent className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="mb-1 text-xs font-medium text-white">
                    {ex.name}
                  </div>
                  <div className="text-[10px] leading-relaxed text-zinc-500">
                    {ex.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
};

export default AgentBuilderSection;
