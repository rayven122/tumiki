import type { JSX } from "react";
import { Link } from "react-router-dom";
import { Wrench, BarChart3, Clock, Plus, ArrowRight, Bell } from "lucide-react";
import { TOOLS, HISTORY, CURRENT_USER, ANNOUNCEMENTS } from "../data/mock";
import type { ToolStatus } from "../data/mock";

/** ステータスに応じたドット色 */
const statusDotColor: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

export const Dashboard = (): JSX.Element => {
  const approvedTools = TOOLS.filter((t) => t.approved);
  const pendingCount = TOOLS.filter((t) => !t.approved).length;
  const totalRequests = approvedTools.reduce(
    (sum, t) => sum + t.stats.requests,
    0,
  );

  // よく使うツール（リクエスト数上位4つ）
  const favoriteTools = [...approvedTools]
    .sort((a, b) => b.stats.requests - a.stats.requests)
    .slice(0, 4);

  // 最近の操作（上位4件）
  const recentHistory = HISTORY.slice(0, 4);

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      {/* 挨拶 */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          おはようございます、{CURRENT_USER.name.replace("太郎", "")}さん
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {CURRENT_USER.department} / {CURRENT_USER.role} ロール
        </p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/[0.05] p-2">
              <Wrench size={18} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">利用可能ツール</p>
              <p className="text-2xl font-semibold text-white">
                {approvedTools.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/[0.05] p-2">
              <BarChart3 size={18} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">今月のリクエスト数</p>
              <p className="text-2xl font-semibold text-white">
                {totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/[0.05] p-2">
              <Clock size={18} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">申請中</p>
              <p className="text-2xl font-semibold text-white">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* よく使うツール */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">よく使うツール</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {favoriteTools.map((tool) => (
            <Link
              key={tool.id}
              to={`/tools/${tool.id}`}
              className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.08] p-4 transition hover:border-white/[0.15]"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] text-sm font-semibold text-white">
                {tool.name.charAt(0)}
                <span
                  className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${statusDotColor[tool.status]}`}
                />
              </div>
              <span className="text-xs text-zinc-400">{tool.name}</span>
            </Link>
          ))}

          {/* 追加ボタン */}
          <Link
            to="/tools/catalog"
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.08] p-4 transition hover:border-white/[0.15]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05]">
              <Plus size={18} className="text-zinc-500" />
            </div>
            <span className="text-xs text-zinc-500">追加</span>
          </Link>
        </div>
      </div>

      {/* 最近の操作 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">最近の操作</h2>
          <Link
            to="/history"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
          >
            すべて見る
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="space-y-3">
          {recentHistory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600">{item.datetime}</span>
                <span className="text-zinc-400">{item.tool}</span>
                <span className="text-zinc-600">{item.operation}</span>
              </div>
              <span
                className={
                  item.status === "success"
                    ? "text-emerald-400"
                    : item.status === "timeout"
                      ? "text-amber-400"
                      : item.status === "blocked"
                        ? "text-red-400"
                        : "text-red-400"
                }
              >
                {item.status === "success"
                  ? "成功"
                  : item.status === "timeout"
                    ? "タイムアウト"
                    : item.status === "blocked"
                      ? "ブロック"
                      : "エラー"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* お知らせ */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell size={14} className="text-zinc-500" />
          <h2 className="text-sm font-medium text-white">お知らせ</h2>
        </div>
        <div className="space-y-3">
          {ANNOUNCEMENTS.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between text-sm"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-zinc-600">{a.date}</span>
                {a.link ? (
                  <Link to={a.link} className="text-zinc-400 hover:text-white">
                    {a.message}
                  </Link>
                ) : (
                  <span className="text-zinc-400">{a.message}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
