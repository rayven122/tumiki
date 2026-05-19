import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import type { AiCodingMetricCategory, AuditLogItem } from "../../main/types";
import { ClientLogo } from "../_components/ClientLogo";
import {
  useAiCodingMetricTools,
  useAiCodingTraceLogs,
} from "../hooks/useAiCodingTelemetry";
import { useAuditLogs } from "../hooks/useAuditLogs";
import {
  AI_METRIC_CATEGORIES,
  AI_METRIC_CATEGORY_LABELS,
  formatAiMetricValue,
  TRACKING_TOOL_LABELS,
} from "../utils/ai-coding-telemetry-tools";
import { isErrorRow, selectStyle, statusBadge } from "../utils/theme-styles";

const formatDateTimeParts = (
  iso: string,
): { dateLabel: string; timeLabel: string } => {
  const date = new Date(iso);
  const now = new Date();
  const today = now.toLocaleDateString("ja-JP");
  const targetDate = date.toLocaleDateString("ja-JP");
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const dateLabel =
    targetDate === today
      ? "今日"
      : targetDate === yesterdayDate.toLocaleDateString("ja-JP")
        ? "昨日"
        : date.toLocaleDateString("ja-JP", {
            month: "2-digit",
            day: "2-digit",
          });

  return {
    dateLabel,
    timeLabel: date.toLocaleTimeString("ja-JP", { hour12: false }),
  };
};

const HistoryTime = ({ iso }: { iso: string }): JSX.Element => {
  const { dateLabel, timeLabel } = formatDateTimeParts(iso);
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-[10px] text-gray-400 dark:text-zinc-600">
        {dateLabel}
      </span>
      <span className="font-mono text-xs font-medium text-gray-700 dark:text-zinc-300">
        {timeLabel}
      </span>
    </span>
  );
};

const toStatus = (item: AuditLogItem): string =>
  item.isSuccess ? "success" : "error";

const escapeCsv = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

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
  const [aiPage, setAiPage] = useState(1);
  const [toolFilter, setToolFilter] = useState("all");
  const [aiToolFilter, setAiToolFilter] = useState<string | "all">("all");
  const [aiCategoryFilter, setAiCategoryFilter] =
    useState<AiCodingMetricCategory>("all");
  const [aiMetricSearch, setAiMetricSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );

  const { result, loading } = useAuditLogs({ page, statusFilter });
  const { tools: aiMetricTools } = useAiCodingMetricTools();
  const { result: aiTraceResult, isLoading: aiTraceLoading } =
    useAiCodingTraceLogs({
      page: aiPage,
      perPage: 15,
      toolFilter: aiToolFilter,
      categoryFilter: aiCategoryFilter,
      metricSearch: aiMetricSearch,
    });

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
  const aiItems = aiTraceResult?.items ?? [];
  const aiTotalCount = aiTraceResult?.totalCount ?? 0;

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          操作履歴
        </h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
          コネクタ操作とAI実行メトリクスをまとめて確認できます
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "コネクタ総件数",
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-b-gray-200 px-5 py-3 dark:border-b-white/[.08]">
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

        <div className="grid grid-cols-[110px_110px_140px_1fr_85px_64px] items-center gap-2 border-b border-b-gray-200 px-5 py-2 text-[10px] text-gray-400 dark:border-b-white/[.08] dark:text-zinc-600">
          <span>日時</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>ツール / メソッド</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {loading && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">
            読み込み中...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">
            コネクタログがありません
          </div>
        )}

        {!loading &&
          filtered.map((item) => {
            const status = toStatus(item);
            const badge = statusBadge(status);
            return (
              <Link
                key={item.id}
                to={`/history/${item.id}`}
                state={{ auditLog: item }}
                className={`grid grid-cols-[110px_110px_140px_1fr_85px_64px] items-center gap-2 border-b border-b-gray-100 px-5 py-2.5 text-xs transition-colors hover:opacity-90 dark:border-b-white/[.03] ${isErrorRow(status) ? "bg-red-500/[0.03]" : ""}`}
              >
                <HistoryTime iso={item.createdAt} />
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <ClientLogo clientName={item.clientName} />
                  <span className="truncate text-[11px] text-gray-500 dark:text-zinc-500">
                    {item.clientName ?? "-"}
                  </span>
                </div>
                <span className="truncate text-gray-600 dark:text-zinc-400">
                  {item.connectionName ?? "不明"}
                </span>
                <span className="truncate font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                  {item.toolName}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
                <span className="text-right font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                  {item.durationMs}ms
                </span>
              </Link>
            );
          })}

        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-t-gray-200 px-5 py-2.5 dark:border-t-white/[.08]">
            <span className="text-xs text-gray-500 dark:text-zinc-500">
              {result.currentPage} / {result.totalPages} ページ
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-gray-500 hover:opacity-80 disabled:opacity-30 dark:text-zinc-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded p-1 text-gray-500 hover:opacity-80 disabled:opacity-30 dark:text-zinc-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-b-gray-200 px-5 py-3 dark:border-b-white/[.08]">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              AI実行ログ
            </span>
            <span className="ml-1 text-xs text-gray-500 dark:text-zinc-500">
              集約 {aiTotalCount}件
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={aiMetricSearch}
              onChange={(e) => {
                setAiMetricSearch(e.target.value);
                setAiPage(1);
              }}
              placeholder="メトリクス名で検索"
              className={`w-[180px] rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
            />
            <select
              value={aiCategoryFilter}
              onChange={(e) => {
                setAiCategoryFilter(e.target.value as AiCodingMetricCategory);
                setAiPage(1);
              }}
              className={`rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
            >
              {AI_METRIC_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {AI_METRIC_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            <select
              value={aiToolFilter}
              onChange={(e) => {
                setAiToolFilter(e.target.value);
                setAiPage(1);
              }}
              className={`rounded-lg px-2 py-1 text-xs outline-none ${selectStyle}`}
            >
              <option value="all">すべてのAIツール</option>
              {aiMetricTools.map((tool) => (
                <option key={tool} value={tool}>
                  {TRACKING_TOOL_LABELS[tool] ?? tool}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-[110px_150px_1fr_72px_110px_70px] items-center gap-2 border-b border-b-gray-200 px-5 py-2 text-[10px] text-gray-400 dark:border-b-white/[.08] dark:text-zinc-600">
          <span>日時</span>
          <span>AIツール</span>
          <span>メトリクス</span>
          <span className="text-right">件数</span>
          <span className="text-right">合計値</span>
          <span className="text-center">属性</span>
        </div>

        {aiTraceLoading && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">
            読み込み中...
          </div>
        )}

        {!aiTraceLoading && aiItems.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">
            AI実行ログがありません
          </div>
        )}

        {!aiTraceLoading &&
          aiItems.map((item) => {
            const toolLabel = TRACKING_TOOL_LABELS[item.tool] ?? item.tool;
            return (
              <div
                key={item.id}
                className="grid grid-cols-[110px_150px_1fr_72px_110px_70px] items-center gap-2 border-b border-b-gray-100 px-5 py-2.5 text-xs dark:border-b-white/[.03]"
              >
                <HistoryTime iso={item.startedAt} />
                <div className="flex items-center gap-1.5 overflow-hidden text-gray-600 dark:text-zinc-400">
                  <ClientLogo clientName={toolLabel} />
                  <span className="truncate">{toolLabel}</span>
                </div>
                <span className="truncate font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                  {item.metricName}
                </span>
                <span className="text-right font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                  {item.sampleCount.toLocaleString()}
                </span>
                <span className="text-right font-mono text-[11px] text-gray-400 dark:text-zinc-600">
                  {formatAiMetricValue(item.metricName, item.value)}
                </span>
                <span className="text-center text-[10px] text-gray-500 dark:text-zinc-500">
                  {item.hasAttributes ? "あり" : "なし"}
                </span>
              </div>
            );
          })}

        {aiTraceResult && aiTraceResult.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-t-gray-200 px-5 py-2.5 dark:border-t-white/[.08]">
            <span className="text-xs text-gray-500 dark:text-zinc-500">
              {aiTraceResult.currentPage} / {aiTraceResult.totalPages} ページ
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={aiPage <= 1}
                onClick={() => setAiPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-gray-500 hover:opacity-80 disabled:opacity-30 dark:text-zinc-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={aiPage >= aiTraceResult.totalPages}
                onClick={() => setAiPage((p) => p + 1)}
                className="rounded p-1 text-gray-500 hover:opacity-80 disabled:opacity-30 dark:text-zinc-500"
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
