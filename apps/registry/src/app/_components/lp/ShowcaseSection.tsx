import { Activity, ShieldCheck, User } from "lucide-react";

import AnimateIn from "./AnimateIn";

/* ===== ストリームデータ ===== */

const STREAM_ROWS = [
  {
    time: "09:14:23",
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
    detail: "PR #142: フロントエンド修正",
  },
  {
    time: "09:14:25",
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
    detail: "「Q3 OKR」で3件取得",
  },
  {
    time: "09:14:27",
    user: "不明",
    ai: { logo: "/logos/ai-clients/cline.webp", invert: false, name: "Cline" },
    service: {
      logo: "/logos/services/github.webp",
      invert: false,
      name: "社内DB",
    },
    tool: "export_all_records",
    status: "blocked" as const,
    detail: "理由: 未認証アクセス",
  },
  {
    time: "09:14:30",
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
    detail: "デザイントークン取得",
  },
  {
    time: "09:14:33",
    user: "佐藤",
    ai: {
      logo: "/logos/ai-clients/chatgpt.webp",
      invert: false,
      name: "ChatGPT",
    },
    service: {
      logo: "/logos/services/slack.webp",
      invert: false,
      name: "Slack",
    },
    tool: "send_message",
    status: "success" as const,
    detail: "#general に送信",
  },
] as const;

/* ===== 権限マトリクスデータ ===== */

type ServiceDef = {
  name: string;
  logo: string;
  invert: boolean;
};

const SERVICES: ServiceDef[] = [
  { name: "GitHub", logo: "/logos/services/github.webp", invert: false },
  { name: "Notion", logo: "/logos/services/notion.webp", invert: false },
  { name: "Slack", logo: "/logos/services/slack.webp", invert: false },
  { name: "Figma", logo: "/logos/services/figma.webp", invert: false },
];

type RoleDef = {
  name: string;
  color: string;
  perms: [string, string, string, string];
};

const ROLES: RoleDef[] = [
  {
    name: "Admin",
    color: "text-emerald-400",
    perms: ["RWX", "RWX", "RWX", "RWX"],
  },
  {
    name: "Developer",
    color: "text-blue-400",
    perms: ["RWX", "R_X", "R_X", "RWX"],
  },
  {
    name: "Sales",
    color: "text-amber-400",
    perms: ["___", "R_X", "RWX", "___"],
  },
];

/* ===== 権限セル ===== */

const PermBadge = ({ perm }: { perm: string }) => {
  if (perm === "___")
    return (
      <span className="rounded bg-red-400/10 px-1.5 py-0.5 font-mono text-[10px] text-red-400">
        {perm}
      </span>
    );
  if (perm === "RWX")
    return (
      <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
        {perm}
      </span>
    );
  return (
    <span className="rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
      {perm}
    </span>
  );
};

/* ===== メインコンポーネント ===== */

const ShowcaseSection = () => {
  return (
    <section className="border-t border-white/[0.08] bg-[#08080a] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        {/* ヘッダー: 左キャッチコピー + 右説明 */}
        <AnimateIn>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end md:gap-12">
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-white md:text-5xl">
              AIツールの利用を、
              <br />
              一画面で把握する
            </h2>
            <p className="max-w-md text-zinc-400 md:text-right">
              従業員がどのAIクライアントで、どのサービスに、何回アクセスしたか。すべての通信をリアルタイムで可視化し、不正なアクセスを即座にブロックします。
            </p>
          </div>
        </AnimateIn>

        {/* プロダクトUIモック */}
        <AnimateIn delay={0.1}>
          <div className="mt-16 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            {/* 左パネル: MCPツール呼び出しストリーム */}
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium text-white">
                    MCPツール呼び出しストリーム
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-zinc-600">
                    リアルタイム
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.03]">
                {STREAM_ROWS.map((row, i) => (
                  <div
                    key={i}
                    className={`px-5 py-3.5 transition-colors hover:bg-white/[0.02] ${row.status === "blocked" ? "bg-red-500/[0.03]" : ""}`}
                    style={{
                      animation: `fade-in 0.4s ease-out ${i * 0.08}s both`,
                    }}
                  >
                    {/* 上段: ユーザー + 時刻 */}
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {row.user === "不明" ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700">
                            <span className="text-[10px] font-medium text-zinc-300">
                              {row.user.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-zinc-300">
                          {row.user}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          (
                          <img
                            src={row.ai.logo}
                            alt={row.ai.name}
                            className={`inline h-3 w-3 ${row.ai.invert ? "invert" : ""}`}
                          />{" "}
                          {row.ai.name})
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-700">
                        {row.time}
                      </span>
                    </div>

                    {/* 下段: サービス/ツール + ステータス + 詳細 */}
                    <div className="flex flex-wrap items-center gap-2 pl-8 text-xs">
                      <img
                        src={row.service.logo}
                        alt={row.service.name}
                        className={`h-4 w-4 rounded-sm ${row.service.invert ? "invert" : ""}`}
                      />
                      <span className="font-mono text-zinc-400">
                        {row.service.name}/{row.tool}
                      </span>
                      <span className="text-zinc-700">→</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          row.status === "success"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {row.status === "success" ? "✓ 成功" : "✕ ブロック"}
                      </span>
                      <span
                        className={`text-[11px] ${row.status === "blocked" ? "text-red-400/60" : "text-zinc-600"}`}
                      >
                        {row.detail}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] px-5 py-2.5">
                <span className="text-[10px] text-zinc-600">
                  直近5件を表示 / 本日の合計: 1,247件
                </span>
              </div>
            </div>

            {/* 右パネル: 権限マトリクス */}
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
                <ShieldCheck className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-white">
                  アクセス制御
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                {ROLES.map((role) => (
                  <div
                    key={role.name}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <p
                      className={`mb-3 text-center text-xs font-semibold ${role.color}`}
                    >
                      {role.name}
                    </p>
                    <div className="space-y-2">
                      {SERVICES.map((svc, si) => (
                        <div
                          key={svc.name}
                          className="flex items-center justify-between gap-1.5 rounded-md border border-white/[0.04] bg-white/[0.02] px-2 py-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <img
                              src={svc.logo}
                              alt={svc.name}
                              className={`h-3.5 w-3.5 ${svc.invert ? "invert" : ""}`}
                            />
                            <span className="text-[10px] text-zinc-400">
                              {svc.name}
                            </span>
                          </div>
                          <PermBadge perm={role.perms[si] ?? "___"} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] px-5 py-2.5">
                <span className="text-[10px] text-zinc-600">
                  R=読取 W=書込 X=実行
                </span>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
};

export default ShowcaseSection;
