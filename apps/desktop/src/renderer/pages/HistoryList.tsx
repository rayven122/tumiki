import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Download } from "lucide-react";
import { HISTORY, type HistoryStatus } from "../data/mock";

/** ステータスバッジの設定を返す */
const statusBadge = (
  status: HistoryStatus,
): { bg: string; text: string; label: string } => {
  const config = {
    success: {
      bg: "var(--badge-success-bg)",
      text: "var(--badge-success-text)",
      label: "成功",
    },
    timeout: {
      bg: "var(--badge-warn-bg)",
      text: "var(--badge-warn-text)",
      label: "タイムアウト",
    },
    blocked: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "ブロック",
    },
    error: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "エラー",
    },
  };
  return config[status];
};

/** 行がエラー系かどうか判定 */
const isErrorRow = (status: HistoryStatus): boolean =>
  status === "blocked" || status === "error";

/** セレクトの共通スタイル */
const selectStyle = {
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-secondary)",
};

export const HistoryList = (): JSX.Element => {
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
  const timeoutCount = filtered.filter((h) => h.status === "timeout").length;

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          操作履歴
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          あなたのAIエージェント操作の記録
        </p>
      </div>

      {/* サマリーカード4つ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "総件数",
            value: total,
            color: "var(--text-primary)",
          },
          {
            label: "成功率",
            value: `${successRate}%`,
            color: "var(--badge-success-text)",
          },
          {
            label: "ブロック",
            value: blockedCount,
            color: "var(--badge-error-text)",
          },
          {
            label: "タイムアウト",
            value: timeoutCount,
            color: "var(--badge-warn-text)",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {card.label}
            </span>
            <div
              className="mt-2 text-2xl font-semibold"
              style={{ color: card.color }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* メインカード（フィルタ + テーブル） */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* フィルタバー */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Activity
              className="h-4 w-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              操作履歴
            </span>
            <span
              className="ml-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {total}件
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
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
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            >
              <option value="all">すべてのステータス</option>
              <option value="success">成功</option>
              <option value="timeout">タイムアウト</option>
              <option value="blocked">ブロック</option>
              <option value="error">エラー</option>
            </select>

            <select
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            >
              <option value="all">すべての操作</option>
              {operations.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs hover:opacity-80"
              style={selectStyle}
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
          </div>
        </div>

        {/* テーブル */}
        <table className="w-full">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--bg-card-hover)",
              }}
            >
              {["日時", "ツール", "操作", "ステータス", "詳細", "応答時間"].map(
                (label) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-[11px] font-medium ${label === "応答時間" ? "text-right" : "text-left"}`}
                    style={{ color: "var(--text-muted)" }}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const badge = statusBadge(item.status);
              return (
                <tr
                  key={item.id}
                  className="transition-colors hover:opacity-90"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: isErrorRow(item.status)
                      ? "var(--bg-error-row, rgba(239,68,68,0.03))"
                      : undefined,
                  }}
                >
                  {/* 日時 */}
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.datetime}
                  </td>

                  {/* ツール */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: "var(--bg-card-hover)" }}
                      >
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          --
                        </span>
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.tool}
                      </span>
                    </div>
                  </td>

                  {/* 操作 */}
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.operation}
                  </td>

                  {/* ステータスバッジ */}
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>

                  {/* 詳細リンク */}
                  <td
                    className="max-w-[200px] truncate px-4 py-3 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Link
                      to={`/history/${item.id}`}
                      className="hover:underline"
                      style={{ color: "var(--text-link, #60a5fa)" }}
                    >
                      {item.detail}
                    </Link>
                  </td>

                  {/* 応答時間 */}
                  <td
                    className="px-4 py-3 text-right font-mono text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.latency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
