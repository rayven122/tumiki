import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { TOOLS, CATEGORIES } from "../data/mock";
import type { ToolStatus } from "../data/mock";

/** ステータスバッジの表示定義 */
const statusBadge: Record<ToolStatus, { className: string; label: string }> = {
  active: {
    className: "bg-emerald-400/10 text-emerald-400",
    label: "稼働中",
  },
  degraded: {
    className: "bg-amber-400/10 text-amber-400",
    label: "応答遅延",
  },
  down: {
    className: "bg-red-400/10 text-red-400",
    label: "停止中",
  },
};

export const MyTools = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("すべて");
  const [statusFilter, setStatusFilter] = useState<ToolStatus | "all">("all");

  // 承認済みツールのみ
  const approvedTools = TOOLS.filter((t) => t.approved);

  // フィルタリング
  const filteredTools = approvedTools.filter((t) => {
    const matchesQuery =
      query === "" ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.includes(query);
    const matchesCategory = category === "すべて" || t.category === category;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">マイツール</h1>
        <Link
          to="/tools/catalog"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
        >
          カタログを見る
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 検索バー */}
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
          />
          <input
            type="text"
            placeholder="ツールを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#111] py-2 pr-3 pl-9 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/[0.15]"
          />
        </div>

        {/* カテゴリフィルタ */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-2 text-sm text-zinc-400 outline-none focus:border-white/[0.15]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* ステータスフィルタ */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ToolStatus | "all")
          }
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-2 text-sm text-zinc-400 outline-none focus:border-white/[0.15]"
        >
          <option value="all">すべてのステータス</option>
          <option value="active">稼働中</option>
          <option value="degraded">応答遅延</option>
          <option value="down">停止中</option>
        </select>
      </div>

      {/* ツールカード一覧 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool) => {
          const badge = statusBadge[tool.status];
          return (
            <div
              key={tool.id}
              className="space-y-4 rounded-xl border border-white/[0.08] bg-[#111] p-5"
            >
              {/* カードヘッダー */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] text-sm font-semibold text-white">
                    {tool.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-zinc-500">{tool.description}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* 詳細情報 */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">権限</span>
                  <span className="text-zinc-400">
                    {tool.permissions.join(", ") || "なし"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">最終利用</span>
                  <span className="text-zinc-400">{tool.lastUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">操作</span>
                  <span className="text-zinc-400">
                    {tool.operations.filter((o) => o.allowed).length} /{" "}
                    {tool.operations.length}
                  </span>
                </div>
              </div>

              {/* 詳細リンク */}
              <Link
                to={`/tools/${tool.id}`}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
              >
                詳細
                <ArrowRight size={12} />
              </Link>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="py-12 text-center text-sm text-zinc-600">
          条件に一致するツールが見つかりません
        </div>
      )}
    </div>
  );
};
