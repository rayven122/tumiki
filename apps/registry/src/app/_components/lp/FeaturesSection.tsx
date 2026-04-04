"use client";

import { useState } from "react";

import { Activity, User } from "lucide-react";

import AnimateIn from "./AnimateIn";

/** サービス一覧（ツール付き） */
const SERVICES = [
  {
    name: "GitHub",
    logo: "/logos/services/github.webp",
    tools: ["create_pr", "list_issues", "merge", "review"],
  },
  {
    name: "Notion",
    logo: "/logos/services/notion.webp",
    tools: ["search_pages", "create_page", "export"],
  },
  {
    name: "Slack",
    logo: "/logos/services/slack.webp",
    tools: ["send_message", "list_channels", "search"],
  },
  {
    name: "Figma",
    logo: "/logos/services/figma.webp",
    tools: ["get_design", "export_svg", "comments"],
  },
  {
    name: "Google Drive",
    logo: "/logos/services/google-drive.svg",
    tools: ["search_files", "upload", "share"],
  },
  {
    name: "社内DB",
    logo: "/logos/services/postgresql.webp",
    tools: ["query", "export", "schema"],
  },
] as const;

/** アバターURL */
const AVATARS = {
  admin: [
    "https://i.pravatar.cc/80?img=68",
    "https://i.pravatar.cc/80?img=60",
    "https://i.pravatar.cc/80?img=59",
  ],
  dev: [
    "https://i.pravatar.cc/80?img=11",
    "https://i.pravatar.cc/80?img=12",
    "https://i.pravatar.cc/80?img=14",
    "https://i.pravatar.cc/80?img=15",
  ],
  designer: [
    "https://i.pravatar.cc/80?img=44",
    "https://i.pravatar.cc/80?img=45",
    "https://i.pravatar.cc/80?img=47",
  ],
  sales: [
    "https://i.pravatar.cc/80?img=32",
    "https://i.pravatar.cc/80?img=36",
    "https://i.pravatar.cc/80?img=38",
  ],
} as const;

/** ロール定義 */
const ROLES = [
  {
    id: "Admin",
    label: "Admin",
    desc: "フルアクセス",
    members: 3,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-500/20",
    avatars: AVATARS.admin,
    defaults: [true, true, true, true, true, true],
    toolDefaults: [
      [true, true, true, true],
      [true, true, true],
      [true, true, true],
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ],
  },
  {
    id: "Dev",
    label: "Dev",
    desc: "開発ツールのみ",
    members: 12,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-500/20",
    avatars: AVATARS.dev,
    defaults: [true, true, true, false, false, false],
    toolDefaults: [
      [true, true, false, true],
      [true, true, false],
      [true, true, true],
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ],
  },
  {
    id: "Designer",
    label: "Designer",
    desc: "デザインツールのみ",
    members: 5,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-500/20",
    avatars: AVATARS.designer,
    defaults: [false, false, true, true, true, false],
    toolDefaults: [
      [false, false, false, false],
      [false, false, false],
      [true, false, false],
      [true, true, true],
      [true, true, false],
      [false, false, false],
    ],
  },
  {
    id: "Sales",
    label: "Sales",
    desc: "業務ツールのみ",
    members: 8,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-500/20",
    avatars: AVATARS.sales,
    defaults: [false, true, true, false, true, false],
    toolDefaults: [
      [false, false, false, false],
      [true, false, false],
      [true, true, false],
      [false, false, false],
      [true, true, false],
      [false, false, false],
    ],
  },
] as const;

const FeaturesSection = () => {
  const [activeRoles, setActiveRoles] = useState<Set<number>>(new Set([0]));

  // ツール単位のマトリクス: [roleIdx][svcIdx][toolIdx]
  const [toolMatrix, setToolMatrix] = useState<boolean[][][]>(
    ROLES.map((r) => r.toolDefaults.map((tools) => [...tools])),
  );

  // ツール単位のトグル
  const flipTool = (
    roleIdx: number,
    svcIdx: number,
    toolIdx: number,
  ) => {
    setToolMatrix((prev) =>
      prev.map((role, ri) =>
        ri === roleIdx
          ? role.map((svc, si) =>
              si === svcIdx
                ? svc.map((v, ti) => (ti === toolIdx ? !v : v))
                : svc,
            )
          : role,
      ),
    );
  };

  // サービス単位のトグル（全ツールまとめてON/OFF）
  const flipService = (roleIdx: number, svcIdx: number) => {
    setToolMatrix((prev) =>
      prev.map((role, ri) => {
        if (ri !== roleIdx) return role;
        return role.map((svc, si) => {
          if (si !== svcIdx) return svc;
          const allOn = svc.every(Boolean);
          return svc.map(() => !allOn);
        });
      }),
    );
  };

  // サービスがONかどうか（ツールが1つでもONならON）
  const isSvcOn = (roleIdx: number, svcIdx: number) =>
    toolMatrix[roleIdx]?.[svcIdx]?.some(Boolean) ?? false;

  // 有効サービス数
  const getEnabledSvcCount = (roleIdx: number) =>
    SERVICES.filter((_, si) => isSvcOn(roleIdx, si)).length;

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
              AIクライアント、接続先サービス、実行ツール、ユーザー、応答時間。すべてのMCP通信を1行単位で記録し、異常を即座に検知します。
            </p>
          </AnimateIn>

          {/* サマリーカード */}
          <AnimateIn delay={0.08}>
            <div className="mt-8 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { value: "342,800", label: "総リクエスト", color: "text-white" },
                { value: "1,247", label: "ブロック", color: "text-red-400" },
                {
                  value: "99.6%",
                  label: "成功率",
                  color: "text-emerald-400",
                },
                {
                  value: "8,420",
                  label: "PIIマスキング",
                  color: "text-amber-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center"
                >
                  <div
                    className={`text-2xl font-semibold tabular-nums ${s.color}`}
                  >
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-600">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>

          <AnimateIn delay={0.1}>
            {/* ツール呼び出しログ */}
            <div className="mt-4 max-w-5xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
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
                        {row.user === "不明" ? (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                            <span className="text-[10px] font-medium text-zinc-300">
                              {row.user.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-zinc-300">{row.user}</span>
                      </div>

                      {/* AIクライアント（実ロゴ） */}
                      <div className="flex items-center gap-1.5">
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

            {/* エクスポート形式 */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">エクスポート:</span>
              {["CSV", "JSON", "SIEM"].map((f) => (
                <span
                  key={f}
                  className="rounded bg-white/[0.06] px-2 py-0.5 text-[9px] text-zinc-500"
                >
                  {f}
                </span>
              ))}
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
            <p className="mt-4 max-w-lg text-zinc-400">
              サービスだけでなく、ツール単位で権限を制御。ロールごとに「何ができるか」を細かく定義できます。
            </p>
          </AnimateIn>

          {/* 縦アコーディオン型ロールカード */}
          <AnimateIn delay={0.05}>
            <div className="mt-10 flex max-w-5xl flex-col gap-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e10] p-2">
              {ROLES.map((role, ri) => {
                const isActive = activeRoles.has(ri);
                const enabledTools =
                  toolMatrix[ri]
                    ?.flat()
                    .filter(Boolean).length ?? 0;
                const totalTools =
                  toolMatrix[ri]?.flat().length ?? 0;

                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      setActiveRoles((prev) => {
                        const next = new Set(prev);
                        if (next.has(ri)) {
                          next.delete(ri);
                        } else {
                          next.add(ri);
                        }
                        return next;
                      });
                    }}
                    className={`cursor-pointer rounded-xl border transition-all duration-400 ease-in-out ${
                      isActive
                        ? `${role.border} bg-gradient-to-b from-white/[0.04] to-transparent`
                        : `border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]`
                    }`}
                  >
                    {/* === 共通ヘッダー行（縮小・拡大で同じ位置） === */}
                    <div className="flex items-center px-5 py-3">
                      {/* ロールバッジ（固定幅） */}
                      <div className="w-16 shrink-0">
                        <div
                          className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold ${role.bg} ${role.color}`}
                        >
                          {role.label}
                        </div>
                      </div>

                      {/* アバタースタック（固定幅） */}
                      <div className="flex w-28 shrink-0 -space-x-1.5">
                        {role.avatars.slice(0, 3).map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="h-6 w-6 rounded-full border-2 border-[#0e0e10] object-cover"
                          />
                        ))}
                        {role.members > 3 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0e0e10] bg-zinc-800">
                            <span className="text-[8px] font-semibold text-zinc-300">
                              +{role.members - 3}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* サービスアイコン横並び（固定幅） */}
                      <div className="flex w-48 shrink-0 items-center gap-2">
                        {SERVICES.map((svc, si) => {
                          const svcOn = isSvcOn(ri, si);
                          return (
                            <img
                              key={svc.name}
                              src={svc.logo}
                              alt={svc.name}
                              className={`h-5 w-5 rounded-sm transition-opacity ${svcOn ? "opacity-100" : "opacity-20"}`}
                            />
                          );
                        })}
                      </div>

                      <span className="ml-auto text-[9px] tabular-nums text-zinc-600">
                        {isActive
                          ? `${enabledTools}/${totalTools} tools`
                          : `${getEnabledSvcCount(ri)}/${SERVICES.length} サービス`}
                      </span>
                    </div>

                    {/* === 拡大コンテンツ（CSS Gridアニメーション） === */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-400 ease-in-out ${
                        isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5">
                          {/* 説明 */}
                          <div className="mb-4 text-[11px] text-zinc-500">
                            {role.desc} · {role.members}名
                          </div>

                          {/* サービス+ツールリスト */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {SERVICES.map((svc, si) => {
                              const svcOn = isSvcOn(ri, si);
                              const allOn =
                                toolMatrix[ri]?.[si]?.every(Boolean) ?? false;
                              return (
                                <div
                                  key={svc.name}
                                  className={`rounded-xl border p-3 transition-all ${
                                    svcOn
                                      ? "border-white/[0.08] bg-white/[0.02]"
                                      : "border-white/[0.04] bg-transparent opacity-35"
                                  }`}
                                >
                                  {/* サービスヘッダー */}
                                  <div className="mb-2 flex items-center gap-2">
                                    <img
                                      src={svc.logo}
                                      alt={svc.name}
                                      className="h-4 w-4 rounded-sm"
                                    />
                                    <span
                                      className={`text-xs font-medium ${svcOn ? "text-white" : "text-zinc-600"}`}
                                    >
                                      {svc.name}
                                    </span>
                                    <div className="ml-auto flex items-center gap-2">
                                      <span className="text-[9px] tabular-nums text-zinc-600">
                                        {toolMatrix[ri]?.[si]?.filter(Boolean)
                                          .length ?? 0}
                                        /{svc.tools.length}
                                      </span>
                                      {/* サービス全体トグル */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          flipService(ri, si);
                                        }}
                                        className={`relative h-3.5 w-6 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${allOn ? "bg-emerald-500" : svcOn ? "bg-amber-500" : "bg-zinc-700/60"}`}
                                      >
                                        <div
                                          className={`absolute top-[1px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-all duration-300 ${svcOn ? "right-[1px] left-auto" : "right-auto left-[1px]"}`}
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  {/* ツールリスト */}
                                  <div className="space-y-0.5">
                                    {svc.tools.map((tool, ti) => {
                                      const toolOn =
                                        toolMatrix[ri]?.[si]?.[ti] ?? false;
                                      return (
                                        <button
                                          key={tool}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            flipTool(ri, si, ti);
                                          }}
                                          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.04]"
                                        >
                                          <div
                                            className={`relative h-3.5 w-6 shrink-0 rounded-full transition-colors duration-300 ${toolOn ? "bg-emerald-500" : "bg-zinc-700/60"}`}
                                          >
                                            <div
                                              className={`absolute top-[1px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-all duration-300 ${toolOn ? "right-[1px] left-auto" : "right-auto left-[1px]"}`}
                                            />
                                          </div>
                                          <span
                                            className={`font-mono text-[10px] transition-colors duration-300 ${toolOn ? "text-zinc-300" : "text-zinc-600 line-through"}`}
                                          >
                                            {tool}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimateIn>

          {/* ポリシー変更ログ */}
          <AnimateIn delay={0.1}>
            <div className="mt-4 max-w-5xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                <span className="text-[11px] font-medium text-zinc-400">
                  ポリシー変更履歴
                </span>
                <span className="text-[10px] text-zinc-600">直近3件</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {[
                  {
                    time: "14:32",
                    admin: "管理者A",
                    action: "Dev → GitHub/merge",
                    change: "OFF → ON",
                    color: "text-emerald-400",
                  },
                  {
                    time: "14:28",
                    admin: "管理者A",
                    action: "Sales → 社内DB",
                    change: "ON → OFF",
                    color: "text-red-400",
                  },
                  {
                    time: "13:55",
                    admin: "管理者B",
                    action: "Dev → Notion/export",
                    change: "OFF → ON",
                    color: "text-emerald-400",
                  },
                ].map((log) => (
                  <div
                    key={log.time + log.action}
                    className="flex items-center gap-3 px-5 py-2.5 text-xs"
                  >
                    <span className="font-mono text-[10px] text-zinc-700">
                      {log.time}
                    </span>
                    <span className="text-zinc-500">{log.admin}</span>
                    <span className="font-mono text-zinc-400">
                      {log.action}
                    </span>
                    <span
                      className={`rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium ${log.color}`}
                    >
                      {log.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
