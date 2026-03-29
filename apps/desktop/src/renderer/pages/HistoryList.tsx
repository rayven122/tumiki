import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity, Download } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { HISTORY, type HistoryStatus } from "../data/mock";

/** ステータスバッジの設定 */
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

/** エラー行かどうか */
const isErrorRow = (status: HistoryStatus): boolean =>
  status === "blocked" || status === "error";

/** セレクトの共通スタイル */
const selectStyle = {
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-secondary)",
};

export const HistoryList = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [operationFilter, setOperationFilter] = useState("all");

  const tools = [...new Set(HISTORY.map((h) => h.tool))];
  const operations = [...new Set(HISTORY.map((h) => h.operation))];

  const filtered = HISTORY.filter((h) => {
    if (toolFilter !== "all" && h.tool !== toolFilter) return false;
    if (statusFilter !== "all" && h.status !== statusFilter) return false;
    if (operationFilter !== "all" && h.operation !== operationFilter)
      return false;
    return true;
  });

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
          { label: "総件数", value: total, color: "var(--text-primary)" },
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
          style={{ borderBottom: "1px solid var(--border)" }}
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
              MCPツール呼び出しログ
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

        {/* テーブルヘッダー */}
        <div
          className="grid grid-cols-[80px_90px_120px_1fr_85px_56px] items-center gap-2 px-5 py-2 text-[10px]"
          style={{
            borderBottom: "1px solid var(--border)",
            color: "var(--text-subtle)",
          }}
        >
          <span>日時</span>
          <span>AIクライアント</span>
          <span>接続先サービス</span>
          <span>ツール / アクション</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {/* テーブル行 */}
        {filtered.map((item) => {
          const badge = statusBadge(item.status);
          return (
            <Link
              key={item.id}
              to={`/history/${item.id}`}
              className="grid grid-cols-[80px_90px_120px_1fr_85px_56px] items-center gap-2 px-5 py-2.5 text-xs transition-colors hover:opacity-90"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                backgroundColor: isErrorRow(item.status)
                  ? "rgba(239,68,68,0.03)"
                  : "transparent",
              }}
            >
              {/* 日時 */}
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {item.datetime.split(" ")[1]?.slice(0, 8)}
              </span>

              {/* AIクライアント */}
              <div className="flex items-center gap-1.5">
                <img
                  src={item.aiClient.logo}
                  alt={item.aiClient.name}
                  className="h-4 w-4 rounded-sm"
                />
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.aiClient.name}
                </span>
              </div>

              {/* 接続先サービス */}
              <div className="flex items-center gap-1.5">
                <img
                  src={
                    theme === "dark"
                      ? item.service.logoDark
                      : item.service.logoLight
                  }
                  alt={item.service.name}
                  className="h-4 w-4 rounded-sm"
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.service.name}
                </span>
              </div>

              {/* ツール / アクション */}
              <span
                className="truncate font-mono text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {item.operation}
              </span>

              {/* ステータス */}
              <span
                className="rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>

              {/* 応答時間 */}
              <span
                className="text-right font-mono text-[11px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {item.latency}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
