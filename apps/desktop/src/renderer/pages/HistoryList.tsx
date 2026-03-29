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
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* ヘッダー */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          操作履歴
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          あなたのAIエージェント操作の記録
        </p>
      </div>

      {/* 期間フィルタ */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          期間
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm outline-none focus:border-white/20"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
        />
        <span style={{ color: "var(--text-muted)" }}>〜</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm outline-none focus:border-white/20"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
        />
      </div>

      {/* セレクトフィルタ */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={toolFilter}
          onChange={(e) => setToolFilter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
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
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
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
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
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
      <div
        className="mb-4 flex items-center gap-6 rounded-xl px-5 py-3"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          全
          <span
            className="mx-1 font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {total}
          </span>
          件
        </span>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          成功率
          <span className="mx-1 font-semibold text-emerald-400">
            {successRate}%
          </span>
        </span>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          遮断
          <span className="mx-1 font-semibold text-red-400">
            {blockedCount}
          </span>
          件
        </span>
      </div>

      {/* テーブル */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr
              style={{
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: "var(--border)",
                backgroundColor: "var(--bg-card-hover)",
              }}
            >
              <th
                className="px-4 py-3 text-left text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                日時
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                ツール
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                操作
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                ステータス
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
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
                  className="hover:opacity-90"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--border-subtle)",
                  }}
                >
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.datetime}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.tool}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
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
          className="rounded-lg px-4 py-2 text-sm hover:opacity-90"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
        >
          CSVダウンロード
        </button>
      </div>
    </div>
  );
};
