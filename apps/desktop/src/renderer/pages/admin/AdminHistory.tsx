import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity, Download } from "lucide-react";
import { themeAtom } from "../../store/atoms";
import { HISTORY } from "../../data/mock";
import { statusBadge, isErrorRow, selectStyle } from "../../utils/theme-styles";

type SummaryCard = {
  label: string;
  value: string | number;
  colorClass: string;
};

export const AdminHistory = (): JSX.Element => {
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
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          監査ログ
        </h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
          全ユーザーのAIエージェント操作の記録
        </p>
      </div>

      {/* サマリーカード4つ */}
      <div className="grid grid-cols-4 gap-3">
        {(
          [
            {
              label: "総件数",
              value: total,
              colorClass: "text-gray-900 dark:text-white",
            },
            {
              label: "成功率",
              value: `${successRate}%`,
              colorClass: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "ブロック",
              value: blockedCount,
              colorClass: "text-red-600 dark:text-red-400",
            },
            {
              label: "タイムアウト",
              value: timeoutCount,
              colorClass: "text-amber-600 dark:text-amber-400",
            },
          ] satisfies SummaryCard[]
        ).map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[.08] dark:bg-zinc-900"
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900">
        {/* フィルタバー */}
        <div className="flex items-center justify-between border-b border-b-gray-200 px-5 py-3 dark:border-b-white/[.08]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              コネクタログ
            </span>
            <span className="ml-1 text-xs text-gray-500 dark:text-zinc-500">
              {total}件
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
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
              className={`rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs hover:opacity-80 ${selectStyle}`}
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
          </div>
        </div>

        {/* テーブルヘッダー */}
        <div className="grid grid-cols-[80px_80px_90px_120px_1fr_85px_56px] items-center gap-2 border-b border-b-gray-200 px-5 py-2 text-[10px] text-gray-400 dark:border-b-white/[.08] dark:text-zinc-600">
          <span>日時</span>
          <span>ユーザー</span>
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
              to={`/history/${item.id}`} /* 詳細は共通の履歴詳細を使用 */
              className={`grid grid-cols-[80px_80px_90px_120px_1fr_85px_56px] items-center gap-2 border-b border-b-gray-100 px-5 py-2.5 text-xs transition-colors hover:opacity-90 dark:border-b-white/[.03] ${isErrorRow(item.status) ? "bg-red-500/[0.03]" : ""}`}
            >
              {/* 日時 */}
              <span className="font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                {item.datetime.split(" ")[1]?.slice(0, 8)}
              </span>

              {/* ユーザー */}
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${
                    item.user === "不明"
                      ? "bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400"
                      : "bg-gray-100 text-gray-600 dark:bg-white/[.08] dark:text-zinc-400"
                  }`}
                >
                  {item.user.charAt(0)}
                </div>
                <span className="text-gray-600 dark:text-zinc-400">
                  {item.user}
                </span>
              </div>

              {/* AIクライアント */}
              <div className="flex items-center gap-1.5">
                <img
                  src={
                    theme === "dark"
                      ? item.aiClient.logoDark
                      : item.aiClient.logoLight
                  }
                  alt={item.aiClient.name}
                  className="h-4 w-4 rounded-sm"
                />
                <span className="text-[11px] text-gray-500 dark:text-zinc-500">
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
                <span className="text-gray-600 dark:text-zinc-400">
                  {item.service.name}
                </span>
              </div>

              {/* ツール / アクション */}
              <span className="truncate font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                {item.operation}
              </span>

              {/* ステータス */}
              <span
                className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.className}`}
              >
                {badge.label}
              </span>

              {/* 応答時間 */}
              <span className="text-right font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                {item.latency}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
