import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditLogItem } from "../../main/types";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { statusBadge, isErrorRow, selectStyle } from "../utils/theme-styles";
import { ClientLogo } from "../_components/ClientLogo";

/** ISO文字列 → HH:mm:ss */
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour12: false });
};

/** ステータスマッピング */
const toStatus = (item: AuditLogItem): string =>
  item.isSuccess ? "success" : "error";

/** CSVフィールドのエスケープ（RFC 4180準拠） */
const escapeCsv = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** CSV生成・ダウンロード */
const downloadCsv = (items: AuditLogItem[]): void => {
  const header =
    "日時,AIクライアント,接続先,ツール,メソッド,ステータス,応答時間(ms)\n";
  const rows = items
    .map((i) =>
      [
        escapeCsv(i.createdAt),
        escapeCsv(i.clientName ?? ""),
        escapeCsv(i.connectionName ?? "不明"),
        escapeCsv(i.toolName),
        escapeCsv(i.method),
        i.isSuccess ? "成功" : "エラー",
        String(i.durationMs),
      ].join(","),
    )
    .join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + header + rows], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const HistoryList = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );

  const { result, loading } = useAuditLogs({ page, statusFilter });

  const items = result?.items ?? [];
  const filtered =
    toolFilter === "all"
      ? items
      : items.filter((i) => i.toolName === toolFilter);
  const tools = [...new Set(items.map((i) => i.toolName))];

  const totalCount = result?.totalCount ?? 0;
  const overallCount = result?.overallCount ?? 0;
  const successRate = result?.successRate ?? 0;
  const errorCount =
    overallCount > 0
      ? overallCount - Math.round((overallCount * successRate) / 100)
      : 0;
  const avgDuration = result?.avgDurationMs ?? 0;

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          操作履歴
        </h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
          あなたのAIエージェント操作の記録
        </p>
      </div>

      {/* サマリーカード4つ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "総件数",
            value: overallCount,
            colorClass: "text-gray-900 dark:text-white",
          },
          {
            label: "成功率",
            value: `${successRate}%`,
            colorClass: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "エラー",
            value: errorCount,
            colorClass: "text-red-600 dark:text-red-400",
          },
          {
            label: "平均応答",
            value: `${Math.round(avgDuration)}ms`,
            colorClass: "text-amber-600 dark:text-amber-400",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 dark:border-white/[.08] bg-white dark:bg-zinc-900 p-4"
          >
            <span className="text-xs text-gray-500 dark:text-zinc-500">
              {card.label}
            </span>
            <div className={`mt-2 text-2xl font-semibold ${card.colorClass}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* メインカード（フィルタ + テーブル） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[.08] bg-white dark:bg-zinc-900">
        {/* フィルタバー */}
        <div className="flex items-center justify-between border-b border-b-gray-200 dark:border-b-white/[.08] px-5 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              コネクタログ
            </span>
            <span className="ml-1 text-xs text-gray-500 dark:text-zinc-500">
              {totalCount}件
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={toolFilter}
              onChange={(e) => {
                setToolFilter(e.target.value);
                setPage(1);
              }}
              className={`rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
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
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "success" | "error");
                setPage(1);
              }}
              className={`rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
            >
              <option value="all">すべてのステータス</option>
              <option value="success">成功</option>
              <option value="error">エラー</option>
            </select>
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs hover:opacity-80 ${selectStyle}`}
              onClick={() => downloadCsv(filtered)}
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
          </div>
        </div>

        {/* テーブルヘッダー */}
        <div className="grid grid-cols-[80px_90px_120px_1fr_85px_56px] items-center gap-2 border-b border-b-gray-200 dark:border-b-white/[.08] px-5 py-2 text-[10px] text-gray-400 dark:text-zinc-600">
          <span>日時</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>ツール / メソッド</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {/* ローディング */}
        {loading && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">
            読み込み中...
          </div>
        )}

        {/* 空状態 */}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">
            操作履歴がありません
          </div>
        )}

        {/* テーブル行 */}
        {!loading &&
          filtered.map((item) => {
            const status = toStatus(item);
            const badge = statusBadge(status);
            return (
              <Link
                key={item.id}
                to={`/history/${item.id}`}
                state={{ auditLog: item }}
                className={`grid grid-cols-[80px_90px_120px_1fr_85px_56px] items-center gap-2 border-b border-b-gray-100 dark:border-b-white/[.03] px-5 py-2.5 text-xs transition-colors hover:opacity-90 ${isErrorRow(status) ? "bg-red-500/[0.03]" : ""}`}
              >
                {/* 日時 */}
                <span className="font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                  {formatTime(item.createdAt)}
                </span>

                {/* AIクライアント */}
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <ClientLogo clientName={item.clientName} />
                  <span className="truncate text-[11px] text-gray-500 dark:text-zinc-500">
                    {item.clientName ?? "-"}
                  </span>
                </div>

                {/* 接続先 */}
                <span className="truncate text-gray-600 dark:text-zinc-400">
                  {item.connectionName ?? "不明"}
                </span>

                {/* ツール / メソッド */}
                <span className="truncate font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                  {item.toolName}
                </span>

                {/* ステータス */}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>

                {/* 応答時間 */}
                <span className="text-right font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                  {item.durationMs}ms
                </span>
              </Link>
            );
          })}

        {/* ページネーション */}
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-t-gray-200 dark:border-t-white/[.08] px-5 py-2.5">
            <span className="text-xs text-gray-500 dark:text-zinc-500">
              {result.currentPage} / {result.totalPages} ページ
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-gray-500 dark:text-zinc-500 hover:opacity-80 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded p-1 text-gray-500 dark:text-zinc-500 hover:opacity-80 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
