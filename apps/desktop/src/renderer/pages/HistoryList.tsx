import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { HISTORY, type HistoryStatus } from "../data/mock";

/** ステータスの表示ラベルとカラーを返す */
const statusDisplay = (
  status: HistoryStatus,
): { label: string; className: string } => {
  switch (status) {
    case "success":
      return { label: "✅ 成功", className: "text-emerald-400" };
    case "timeout":
      return { label: "⚠️ タイムアウト", className: "text-amber-400" };
    case "blocked":
      return { label: "🔴 権限不足", className: "text-red-400" };
    case "error":
      return { label: "🔴 エラー", className: "text-red-400" };
  }
};

export const HistoryList = (): JSX.Element => {
  // 期間フィルタ（装飾的）
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // セレクトフィルタ
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [operationFilter, setOperationFilter] = useState("all");

  // ユニークなツール・操作を取得
  const tools = [...new Set(HISTORY.map((h) => h.tool))];
  const operations = [...new Set(HISTORY.map((h) => h.operation))];

  // フィルタ適用
  const filtered = HISTORY.filter((h) => {
    if (toolFilter !== "all" && h.tool !== toolFilter) return false;
    if (statusFilter !== "all" && h.status !== statusFilter) return false;
    if (operationFilter !== "all" && h.operation !== operationFilter)
      return false;
    return true;
  });

  // サマリー計算
  const total = filtered.length;
  const successCount = filtered.filter((h) => h.status === "success").length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const blockedCount = filtered.filter((h) => h.status === "blocked").length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">操作履歴</h1>
        <p className="mt-1 text-sm text-zinc-400">
          あなたのAIエージェント操作の記録
        </p>
      </div>

      {/* 期間フィルタ */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-zinc-500">期間</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-1.5 text-sm text-zinc-300 outline-none focus:border-white/20"
        />
        <span className="text-zinc-500">〜</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-1.5 text-sm text-zinc-300 outline-none focus:border-white/20"
        />
      </div>

      {/* セレクトフィルタ */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={toolFilter}
          onChange={(e) => setToolFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">すべてのツール</option>
          {tools.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">すべてのステータス</option>
          <option value="success">成功</option>
          <option value="timeout">タイムアウト</option>
          <option value="blocked">権限不足</option>
          <option value="error">エラー</option>
        </select>

        <select
          value={operationFilter}
          onChange={(e) => setOperationFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-[#111] px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="all">すべての操作</option>
          {operations.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>

      {/* サマリーバー */}
      <div className="mb-4 flex items-center gap-6 rounded-xl border border-white/[0.08] bg-[#111] px-5 py-3">
        <span className="text-sm text-zinc-300">
          全<span className="mx-1 font-semibold text-white">{total}</span>件
        </span>
        <span className="text-sm text-zinc-300">
          成功率
          <span className="mx-1 font-semibold text-emerald-400">
            {successRate}%
          </span>
        </span>
        <span className="text-sm text-zinc-300">
          遮断
          <span className="mx-1 font-semibold text-red-400">
            {blockedCount}
          </span>
          件
        </span>
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500">
                日時
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500">
                ツール
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500">
                操作
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500">
                詳細
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const display = statusDisplay(item.status);
              return (
                <tr
                  key={item.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {item.datetime}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {item.tool}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-zinc-400">
                    {item.operation}
                  </td>
                  <td className={`px-4 py-3 text-sm ${display.className}`}>
                    {display.label}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/history/${item.id}`}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CSVダウンロードボタン */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-white/[0.08] bg-[#111] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.04]"
        >
          CSVダウンロード
        </button>
      </div>
    </div>
  );
};
