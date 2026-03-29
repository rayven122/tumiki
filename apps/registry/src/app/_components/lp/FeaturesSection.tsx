"use client";

import { useState } from "react";

import { Activity, ShieldCheck, User } from "lucide-react";

import AnimateIn from "./AnimateIn";

// ロール別のサービスON/OFFデフォルト
const ROLE_DEFAULTS: Record<string, boolean[]> = {
  Admin: [true, true, true, true, true, true],
  Dev: [true, true, true, false, false, false],
  Sales: [false, true, true, false, true, false],
};

const ROLES = ["Admin", "Dev", "Sales"] as const;

const FeaturesSection = () => {
  const [activeRole, setActiveRole] = useState<string>("Admin");
  const [toggles, setToggles] = useState<boolean[]>([
    ...(ROLE_DEFAULTS.Admin ?? []),
  ]);

  // ロール切替時にトグルをリセット
  const switchRole = (role: string) => {
    setActiveRole(role);
    setToggles([
      ...(ROLE_DEFAULTS[role] ?? [true, true, true, true, true, true]),
    ]);
  };

  // 個別トグルの切替
  const flipToggle = (idx: number) => {
    setToggles((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  return (
    <section
      id="features"
      className="border-t border-white/[0.08] bg-[#0c0c0e] py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5">
        <AnimateIn>
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-white md:text-5xl">
            監視。制御。記録。
            <br />
            <span className="text-zinc-500">すべてを、ひとつに。</span>
          </h2>
        </AnimateIn>

        {/* ===== Feature 1: 通信の管理・監視 ===== */}
        <div className="mt-24 md:mt-32">
          <AnimateIn>
            <p className="font-mono text-xs font-medium tracking-widest text-zinc-500 uppercase">
              Monitor
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              通信の管理・監視
            </h3>
            <p className="mt-4 max-w-lg text-zinc-400">
              従業員がAIを通じてどのサービスにアクセスしたか、リアルタイムで可視化。不正アクセスは即時遮断。
            </p>
          </AnimateIn>

          <AnimateIn delay={0.1}>
            {/* ツール呼び出しログ */}
            <div className="mt-8 max-w-5xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium text-white">
                    MCPツール呼び出しログ
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">リアルタイム</span>
              </div>

              {/* テーブルヘッダー（デスクトップのみ） */}
              <div className="hidden border-b border-white/[0.06] px-5 py-2 text-[10px] text-zinc-600 md:grid md:grid-cols-[100px_80px_80px_120px_1fr_64px_56px] md:items-center md:gap-2">
                <span>日時</span>
                <span>ユーザー</span>
                <span>AIクライアント</span>
                <span>接続先サービス</span>
                <span>ツール / アクション</span>
                <span>ステータス</span>
                <span>応答</span>
              </div>

              {/* テーブル行 */}
              <div className="divide-y divide-white/[0.03]">
                {[
                  {
                    time: "17:22:43",
                    user: "田中",
                    avatar:
                      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop&crop=face",
                    ai: {
                      logo: "/logos/ai-clients/cursor.webp",
                      invert: false,
                      name: "Cursor",
                    },
                    service: {
                      logo: "/logos/services/github.webp",
                      invert: false,
                      name: "GitHub",
                    },
                    tool: "create_pull_request",
                    status: "success" as const,
                    latency: "1.2s",
                  },
                  {
                    time: "17:22:25",
                    user: "鈴木",
                    avatar:
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face",
                    ai: {
                      logo: "/logos/ai-clients/chatgpt.webp",
                      invert: false,
                      name: "ChatGPT",
                    },
                    service: {
                      logo: "/logos/services/notion.webp",
                      invert: false,
                      name: "Notion",
                    },
                    tool: "search_pages",
                    status: "success" as const,
                    latency: "0.8s",
                  },
                  {
                    time: "17:21:34",
                    user: "不明",
                    avatar: null,
                    ai: {
                      logo: "/logos/ai-clients/cline.webp",
                      invert: false,
                      name: "Cline",
                    },
                    service: {
                      logo: "/logos/services/github.webp",
                      invert: false,
                      name: "社内DB",
                    },
                    tool: "export_all_records",
                    status: "blocked" as const,
                    latency: "—",
                  },
                  {
                    time: "17:21:00",
                    user: "山田",
                    avatar:
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
                    ai: {
                      logo: "/logos/ai-clients/cursor.webp",
                      invert: false,
                      name: "Cursor",
                    },
                    service: {
                      logo: "/logos/services/figma.webp",
                      invert: false,
                      name: "Figma",
                    },
                    tool: "get_design_tokens",
                    status: "success" as const,
                    latency: "2.1s",
                  },
                  {
                    time: "17:20:45",
                    user: "佐藤",
                    avatar:
                      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
                    ai: {
                      logo: "/logos/ai-clients/chatgpt.webp",
                      invert: false,
                      name: "ChatGPT",
                    },
                    service: {
                      logo: "/logos/services/notion.webp",
                      invert: false,
                      name: "Notion",
                    },
                    tool: "create_page",
                    status: "success" as const,
                    latency: "1.5s",
                  },
                  {
                    time: "17:20:12",
                    user: "田中",
                    avatar:
                      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop&crop=face",
                    ai: {
                      logo: "/logos/ai-clients/cursor.webp",
                      invert: false,
                      name: "Cursor",
                    },
                    service: {
                      logo: "/logos/services/github.webp",
                      invert: false,
                      name: "GitHub",
                    },
                    tool: "list_issues",
                    status: "success" as const,
                    latency: "0.6s",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`px-5 py-3 text-xs transition-colors hover:bg-white/[0.02] ${row.status === "blocked" ? "bg-red-500/[0.03]" : ""}`}
                    style={{
                      animation: `fade-in 0.4s ease-out ${i * 0.06}s both`,
                    }}
                  >
                    {/* モバイル: フレックスラップ / デスクトップ: グリッド */}
                    <div className="flex flex-wrap items-center gap-2 md:grid md:grid-cols-[100px_80px_80px_120px_1fr_64px_56px] md:gap-2">
                      {/* 日時 */}
                      <span className="order-last ml-auto font-mono text-[11px] text-zinc-600 md:order-none md:ml-0">
                        {row.time}
                      </span>

                      {/* ユーザー */}
                      <div className="flex items-center gap-1.5">
                        {row.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.avatar}
                            alt={row.user}
                            className="h-5 w-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <span className="text-zinc-300">{row.user}</span>
                      </div>

                      {/* AIクライアント（実ロゴ） */}
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.ai.logo}
                          alt={row.ai.name}
                          className={`h-4 w-4 rounded-sm ${row.ai.invert ? "invert" : ""}`}
                        />
                        <span className="text-[11px] text-zinc-400">
                          {row.ai.name}
                        </span>
                      </div>

                      {/* 接続先サービス（実ロゴ） */}
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.service.logo}
                          alt={row.service.name}
                          className={`h-4 w-4 rounded-sm ${row.service.invert ? "invert" : ""}`}
                        />
                        <span className="text-zinc-300">
                          {row.service.name}
                        </span>
                      </div>

                      {/* ツール / アクション */}
                      <span className="basis-full truncate font-mono text-[11px] text-zinc-500 md:basis-auto">
                        {row.tool}
                      </span>

                      {/* ステータス */}
                      <span
                        className={`inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
                          row.status === "success"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {row.status === "success" ? "✓ 成功" : "✕ ブロック"}
                      </span>

                      {/* 応答時間 */}
                      <span className="text-right font-mono text-[11px] text-zinc-600">
                        {row.latency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* レポートサマリー（Monitorに統合） */}
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-lg bg-white/[0.03] p-2.5 text-center">
                <div className="text-lg font-semibold text-white">342,800</div>
                <div className="text-[9px] text-zinc-600">総リクエスト</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-2.5 text-center">
                <div className="text-lg font-semibold text-red-400">1,247</div>
                <div className="text-[9px] text-zinc-600">ブロック</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-2.5 text-center">
                <div className="text-lg font-semibold text-white">0.36%</div>
                <div className="text-[9px] text-zinc-600">ブロック率</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-2.5 text-center">
                <div className="text-lg font-semibold text-amber-400">
                  8,420
                </div>
                <div className="text-[9px] text-zinc-600">PIIマスキング</div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[9px] text-zinc-500">
                CSV
              </span>
              <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[9px] text-zinc-500">
                JSON
              </span>
              <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[9px] text-zinc-500">
                SIEM
              </span>
            </div>
          </AnimateIn>
        </div>

        {/* ===== Feature 2: ツール制御・権限 ===== */}
        <div className="mt-24 md:mt-32">
          <AnimateIn>
            <p className="font-mono text-xs font-medium tracking-widest text-zinc-500 uppercase">
              Control
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              ツールを自在にコントロール
            </h3>
          </AnimateIn>

          {/* 2つのUI: ロール権限 + Description上書き */}
          <div className="mt-10 max-w-5xl space-y-6">
            {/* --- パネル1: ロール別権限トグル --- */}
            <AnimateIn delay={0.05}>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                  <span className="text-[11px] font-medium text-zinc-400">
                    ロール別アクセス権限
                  </span>
                  <div className="flex gap-1 rounded-md bg-white/[0.04] p-0.5">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => switchRole(role)}
                        className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                          activeRole === role
                            ? "bg-white/[0.12] text-white"
                            : "text-zinc-600 hover:text-zinc-400"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-px bg-white/[0.03] sm:grid-cols-2 md:grid-cols-3">
                  {[
                    {
                      name: "GitHub",
                      logo: "/logos/services/github.webp",
                      invert: false,
                      tools: ["create_pr", "list_issues", "merge"],
                    },
                    {
                      name: "Notion",
                      logo: "/logos/services/notion.webp",
                      invert: false,
                      tools: ["search_pages", "create_page", "export"],
                    },
                    {
                      name: "Slack",
                      logo: "/logos/services/slack.webp",
                      invert: false,
                      tools: ["send_message", "list_channels", "search"],
                    },
                    {
                      name: "Figma",
                      logo: "/logos/services/figma.webp",
                      invert: false,
                      tools: ["get_design", "export_svg", "comments"],
                    },
                    {
                      name: "Google Drive",
                      logo: "/logos/services/google-drive.svg",
                      invert: false,
                      tools: ["search_files", "upload", "share"],
                    },
                    {
                      name: "社内DB",
                      logo: "/logos/services/postgresql.webp",
                      invert: false,
                      tools: ["query", "export", "schema"],
                    },
                  ].map((srv, idx) => {
                    const isOn = toggles[idx] ?? false;
                    return (
                      <div key={srv.name} className="bg-[#111] p-3">
                        <div className="mb-2 flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={srv.logo}
                            alt={srv.name}
                            className={`h-4 w-4 ${srv.invert ? "invert" : ""}`}
                          />
                          <span
                            className={`text-xs transition-colors duration-200 ${isOn ? "text-white" : "text-zinc-600"}`}
                          >
                            {srv.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => flipToggle(idx)}
                            className={`relative ml-auto h-4 w-7 cursor-pointer rounded-full transition-colors duration-200 ${isOn ? "bg-emerald-500" : "bg-zinc-700"}`}
                            aria-label={`${srv.name}の権限を${isOn ? "オフ" : "オン"}にする`}
                          >
                            <div
                              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all duration-200 ${isOn ? "right-0.5 left-auto" : "right-auto left-0.5"}`}
                            />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {srv.tools.map((t) => (
                            <span
                              key={t}
                              className={`rounded px-1.5 py-0.5 font-mono text-[8px] transition-colors duration-200 ${isOn ? "bg-white/[0.06] text-zinc-500" : "bg-white/[0.02] text-zinc-700"}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AnimateIn>

            {/* --- パネル2: ツールDescription上書き --- */}
            <AnimateIn delay={0.1}>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                  <span className="text-[11px] font-medium text-zinc-400">
                    ツールDescription上書き
                  </span>
                  <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-400">
                    AI精度向上
                  </span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {[
                    {
                      tool: "search_pages",
                      service: "Notion",
                      logo: "/logos/services/notion.webp",
                      invert: false,
                      original: "Search for pages in the workspace",
                      override:
                        "社内のQ3 OKRドキュメントと議事録を検索する。部署名やプロジェクト名で絞り込み可能。",
                    },
                    {
                      tool: "create_pr",
                      service: "GitHub",
                      logo: "/logos/services/github.webp",
                      invert: false,
                      original: "Create a pull request",
                      override:
                        "mainブランチへのPRを作成。レビュアーにチームリードを自動アサイン。CI必須。",
                    },
                    {
                      tool: "send_message",
                      service: "Slack",
                      logo: "/logos/services/slack.webp",
                      invert: false,
                      original: "Send a message to a channel",
                      override:
                        "#general と #dev チャンネルのみ送信可。DMは禁止。メンション@hereは管理者承認が必要。",
                    },
                  ].map((item) => (
                    <div key={item.tool} className="px-5 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.logo}
                          alt={item.service}
                          className={`h-4 w-4 ${item.invert ? "invert" : ""}`}
                        />
                        <span className="font-mono text-[11px] text-white">
                          {item.service}/{item.tool}
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg bg-white/[0.02] p-2.5">
                          <div className="mb-1 text-[9px] text-zinc-600">
                            元のDescription
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500 line-through">
                            {item.original}
                          </div>
                        </div>
                        <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] p-2.5">
                          <div className="mb-1 flex items-center gap-1 text-[9px] text-emerald-400">
                            <span>✎</span> カスタムDescription
                          </div>
                          <div className="text-[10px] leading-relaxed text-zinc-300">
                            {item.override}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>

        {/* ===== Feature 3: コネクタ ===== */}
        <div className="mt-24 md:mt-32">
          <AnimateIn>
            <p className="font-mono text-xs font-medium tracking-widest text-zinc-500 uppercase">
              Connector
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              接続先ツール
            </h3>
          </AnimateIn>

          <div className="mt-10 max-w-5xl space-y-6">
            {/* --- パネル1: コネクタ一覧（アプリ画面風） --- */}
            <AnimateIn delay={0.05}>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111] shadow-2xl shadow-white/[0.02]">
                {/* ウィンドウバー */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    </div>
                    <span className="ml-2 text-xs text-zinc-600">
                      tumiki — コネクタ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">
                      9コネクタ利用可能
                    </span>
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[9px] text-zinc-500">
                      検索
                    </span>
                  </div>
                </div>
                {/* カードグリッド */}
                <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
                  {[
                    {
                      name: "GitHub",
                      logo: "/logos/services/github.webp",
                      invert: false,
                      desc: "リポジトリ・Issue・PR管理",
                      tools: 8,
                      added: true,
                    },
                    {
                      name: "Notion",
                      logo: "/logos/services/notion.webp",
                      invert: false,
                      desc: "ページ検索・作成・編集",
                      tools: 6,
                      added: true,
                    },
                    {
                      name: "Slack",
                      logo: "/logos/services/slack.webp",
                      invert: false,
                      desc: "メッセージ送信・チャンネル管理",
                      tools: 5,
                      added: true,
                    },
                    {
                      name: "Figma",
                      logo: "/logos/services/figma.webp",
                      invert: false,
                      desc: "デザイントークン・コメント取得",
                      tools: 4,
                      added: false,
                    },
                    {
                      name: "Google Drive",
                      logo: "/logos/services/google-drive.svg",
                      invert: false,
                      desc: "ファイル検索・アップロード・共有",
                      tools: 5,
                      added: false,
                    },
                    {
                      name: "PostgreSQL",
                      logo: "/logos/services/postgresql.webp",
                      invert: false,
                      desc: "クエリ実行・スキーマ取得",
                      tools: 3,
                      added: true,
                    },
                    {
                      name: "Sentry",
                      logo: "/logos/services/sentry.webp",
                      invert: false,
                      desc: "エラー監視・アラート管理",
                      tools: 4,
                      added: false,
                    },
                    {
                      name: "Microsoft Teams",
                      logo: "/logos/services/microsoft-teams.webp",
                      invert: false,
                      desc: "メッセージ・会議・チャネル",
                      tools: 6,
                      added: true,
                    },
                    {
                      name: "Playwright",
                      logo: "/logos/services/playwright.webp",
                      invert: false,
                      desc: "ブラウザ操作・テスト自動化",
                      tools: 3,
                      added: false,
                    },
                  ].map((srv, i) => (
                    <div
                      key={srv.name}
                      className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                        srv.added
                          ? "border-emerald-500/20 bg-[#111]"
                          : "border-white/[0.06] bg-[#111] hover:border-white/[0.12]"
                      }`}
                      style={{
                        animation: `fade-in 0.4s ease-out ${i * 0.05}s both`,
                      }}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={srv.logo}
                          alt={srv.name}
                          className={`h-8 w-8 rounded-lg ${srv.invert ? "invert" : ""}`}
                        />
                        {srv.added && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="mb-1 text-sm font-medium text-white">
                        {srv.name}
                      </div>
                      <div className="mb-3 text-[10px] leading-relaxed text-zinc-500">
                        {srv.desc}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-zinc-600">
                          {srv.tools} tools
                        </span>
                        <button
                          className={`rounded-md px-3 py-1 text-[10px] font-medium transition ${
                            srv.added
                              ? "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1]"
                              : "bg-white text-black hover:bg-zinc-200"
                          }`}
                        >
                          {srv.added ? "管理" : "+ 追加"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>

            {/* --- パネル2: ツール統合 → 仮想MCP → AI紐付け --- */}
            <AnimateIn delay={0.1}>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                  <span className="text-[11px] font-medium text-zinc-400">
                    ツール統合 → 仮想MCP → AI紐付け
                  </span>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[9px] text-zinc-400">
                    複数MCP → 1仮想MCP → AI配信
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
                    {/* Step 1: 複数MCPツール */}
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <div className="mb-1 text-center font-mono text-[9px] text-zinc-600">
                        MCPツール
                      </div>
                      {[
                        {
                          service: "GitHub",
                          logo: "/logos/services/github.webp",
                          invert: false,
                          tool: "list_issues",
                        },
                        {
                          service: "Notion",
                          logo: "/logos/services/notion.webp",
                          invert: false,
                          tool: "search_pages",
                        },
                        {
                          service: "Slack",
                          logo: "/logos/services/slack.webp",
                          invert: false,
                          tool: "send_message",
                        },
                      ].map((t) => (
                        <div
                          key={t.tool}
                          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.logo}
                            alt={t.service}
                            className={`h-3 w-3 ${t.invert ? "invert" : ""}`}
                          />
                          <span className="font-mono text-[9px] text-zinc-500">
                            {t.tool}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 矢印1 */}
                    <div className="text-zinc-700">
                      <span className="hidden md:inline">→</span>
                      <span className="md:hidden">↓</span>
                    </div>

                    {/* Step 2: 仮想MCP（統合ツール） */}
                    <div className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
                      <div className="mb-1 text-center font-mono text-[9px] text-emerald-400/60">
                        仮想MCP
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-mono text-xs font-medium text-white">
                            weekly_report
                          </div>
                          <div className="mt-0.5 flex gap-1">
                            {["list_issues", "search", "send"].map((t) => (
                              <span
                                key={t}
                                className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[7px] text-zinc-600"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 矢印2 */}
                    <div className="text-zinc-700">
                      <span className="hidden md:inline">→</span>
                      <span className="md:hidden">↓</span>
                    </div>

                    {/* Step 3: AIクライアントに紐付け */}
                    <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                      <div className="mb-2 text-center font-mono text-[9px] text-zinc-600">
                        AIクライアントに配信
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            name: "Cursor",
                            logo: "/logos/ai-clients/cursor.webp",
                            invert: false,
                            connected: true,
                          },
                          {
                            name: "ChatGPT",
                            logo: "/logos/ai-clients/chatgpt.webp",
                            invert: false,
                            connected: true,
                          },
                          {
                            name: "Claude",
                            logo: "/logos/ai-clients/claude.webp",
                            invert: false,
                            connected: false,
                          },
                          {
                            name: "Copilot",
                            logo: "/logos/ai-clients/copilot.webp",
                            invert: false,
                            connected: true,
                          },
                        ].map((ai) => (
                          <div
                            key={ai.name}
                            className={`flex items-center gap-2 rounded-lg p-2 ${ai.connected ? "border border-emerald-500/20 bg-emerald-500/[0.03]" : "border border-white/[0.04] bg-white/[0.01]"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ai.logo}
                              alt={ai.name}
                              className={`h-4 w-4 ${ai.invert ? "invert" : ""}`}
                            />
                            <span
                              className={`text-[10px] ${ai.connected ? "text-white" : "text-zinc-600"}`}
                            >
                              {ai.name}
                            </span>
                            {ai.connected && (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
