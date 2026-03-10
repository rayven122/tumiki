"use client";

import type { RouterOutputs } from "@/trpc/react";
import { format } from "date-fns";
import { Loader2, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useMemo } from "react";

/** ログイベントタイプ */
type LogEventType = "start" | "tool" | "end" | "running";

/** ターミナルログエントリ */
type TerminalLogEntry = {
  id: string;
  timestamp: Date;
  agentSlug: string;
  eventType: LogEventType;
  status: "success" | "error" | "running" | null;
  message: string;
  // 追加情報
  triggerName?: string; // START時: トリガー種別
  modelId?: string; // START時: モデル名
  toolName?: string; // TOOL時: ツール名
  durationMs?: number; // END時: 実行時間
};

/** APIから取得した実行アイテムの型 */
type RecentExecutionItem =
  RouterOutputs["agentExecution"]["getRecent"]["items"][number];

/** コンポーネントプロパティ */
type RealtimeLogPanelProps = {
  executions: RecentExecutionItem[];
  isLoading: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

/** 時刻をフォーマット */
const formatTime = (date: Date): string => format(date, "HH:mm:ss");

/** 実行時間をフォーマット */
const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}秒`;

/** モデルIDを表示用に短縮 */
const formatModelId = (modelId: string): string => {
  // "anthropic/claude-3-5-haiku" → "claude-3-5-haiku"
  const parts = modelId.split("/");
  return parts[parts.length - 1] ?? modelId;
};

/**
 * 実行アイテムをログエントリに変換
 */
const convertExecutionToLogEntries = (
  execution: RecentExecutionItem,
): TerminalLogEntry[] => {
  const entries: TerminalLogEntry[] = [];
  const {
    id,
    createdAt,
    agentSlug,
    success,
    scheduleName,
    modelId,
    durationMs,
    toolCalls,
    latestMessage,
  } = execution;
  const timestamp = new Date(createdAt);

  // 1. START イベント
  entries.push({
    id: `${id}-start`,
    timestamp,
    agentSlug,
    eventType: "start",
    status: null,
    message: "",
    triggerName: scheduleName ?? "手動実行",
    modelId: modelId ? formatModelId(modelId) : undefined,
  });

  // 2. TOOL イベント（各ツール呼び出し）
  for (const tool of toolCalls) {
    entries.push({
      id: `${id}-tool-${tool.toolName}`,
      timestamp,
      agentSlug,
      eventType: "tool",
      status: tool.state,
      message: "",
      toolName: tool.toolName,
    });
  }

  // 3. END イベント（完了時のみ）または RUNNING イベント
  if (success !== null) {
    entries.push({
      id: `${id}-end`,
      timestamp,
      agentSlug,
      eventType: "end",
      status: success ? "success" : "error",
      message: latestMessage ?? "",
      durationMs: durationMs ?? undefined,
    });
  } else {
    entries.push({
      id: `${id}-running`,
      timestamp,
      agentSlug,
      eventType: "running",
      status: "running",
      message: "処理中...",
    });
  }

  return entries;
};

/** ツールステータスの表示情報を取得 */
const getToolStatusDisplay = (
  status: "success" | "error" | "running" | null,
): { colorClass: string; label: string } => {
  switch (status) {
    case "success":
      return { colorClass: "text-green-400", label: "完了" };
    case "error":
      return { colorClass: "text-red-400", label: "エラー" };
    default:
      return { colorClass: "text-yellow-400", label: "呼び出し中..." };
  }
};

/** 終了ステータスの表示情報を取得 */
const getEndStatusDisplay = (
  status: "success" | "error" | "running" | null,
): { colorClass: string; label: string } => {
  if (status === "success") {
    return { colorClass: "text-green-400", label: "成功" };
  }
  return { colorClass: "text-red-400", label: "失敗" };
};

/** ログ行コンポーネント */
const LogLine = ({ entry }: { entry: TerminalLogEntry }) => {
  const time = formatTime(entry.timestamp);

  switch (entry.eventType) {
    case "start":
      return (
        <div className="flex gap-2 font-mono text-sm">
          <span className="shrink-0 text-slate-400">{time}</span>
          <span className="shrink-0 text-cyan-400">[{entry.agentSlug}]</span>
          <span className="shrink-0 text-cyan-400">START</span>
          <span className="min-w-0 flex-1 truncate text-slate-300">
            {entry.triggerName}
            {entry.modelId && ` | ${entry.modelId}`}
          </span>
        </div>
      );

    case "tool": {
      const { colorClass, label } = getToolStatusDisplay(entry.status);
      return (
        <div className="flex gap-2 font-mono text-sm">
          <span className="shrink-0 text-slate-400">{time}</span>
          <span className="shrink-0 text-cyan-400">[{entry.agentSlug}]</span>
          <span className="shrink-0 text-yellow-400">TOOL </span>
          <span className={`min-w-0 flex-1 truncate ${colorClass}`}>
            {entry.toolName} {label}
          </span>
        </div>
      );
    }

    case "end": {
      const { colorClass, label } = getEndStatusDisplay(entry.status);
      const duration =
        entry.durationMs !== undefined ? formatDuration(entry.durationMs) : "";

      return (
        <div className="flex gap-2 font-mono text-sm">
          <span className="shrink-0 text-slate-400">{time}</span>
          <span className="shrink-0 text-cyan-400">[{entry.agentSlug}]</span>
          <span className={`shrink-0 ${colorClass}`}>END </span>
          <span className={`shrink-0 ${colorClass}`}>{label}</span>
          {duration && (
            <span className="shrink-0 text-slate-400">| {duration}</span>
          )}
          <span className="min-w-0 flex-1 truncate text-slate-300">
            {entry.message}
          </span>
        </div>
      );
    }

    case "running":
      return (
        <div className="flex gap-2 font-mono text-sm">
          <span className="shrink-0 text-slate-400">{time}</span>
          <span className="shrink-0 text-cyan-400">[{entry.agentSlug}]</span>
          <span className="shrink-0 text-slate-400">... </span>
          <span className="min-w-0 flex-1 truncate text-slate-400">
            {entry.message}
          </span>
        </div>
      );
  }
};

type LogContentProps = {
  isLoading: boolean;
  logEntries: TerminalLogEntry[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
};

/** ログコンテンツコンポーネント */
const LogContent = ({
  isLoading,
  logEntries,
  isFetchingNextPage,
  hasNextPage,
}: LogContentProps) => {
  // ローディング状態
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  // 空状態
  if (logEntries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-slate-400">
        実行履歴がありません
      </div>
    );
  }

  // ログ一覧
  return (
    <>
      {!hasNextPage && logEntries.length > 0 && (
        <div className="py-2 text-center font-mono text-xs text-slate-500">
          --- ログの先頭 ---
        </div>
      )}
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      )}
      {logEntries.map((entry) => (
        <LogLine key={entry.id} entry={entry} />
      ))}
    </>
  );
};

/**
 * リアルタイムログパネル
 * ターミナル風UIで直近の実行履歴を時系列順に表示
 */
export const RealtimeLogPanel = ({
  executions,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: RealtimeLogPanelProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevItemsLengthRef = useRef(0);

  // 無限スクロール: 上端に近づいたら次のページ（過去のデータ）を読み込む
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;

    // 上端に近づいたら過去のログを読み込む
    if (container.scrollTop < 50) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // 実行アイテムをログエントリに変換（時系列順: 古い→新しい）
  // 親コンポーネントから新しい順で渡されるので、逆順にして古い順にする
  const allItems = useMemo(() => executions.slice().reverse(), [executions]);

  const logEntries = useMemo(() => {
    return allItems.flatMap((item) => convertExecutionToLogEntries(item));
  }, [allItems]);

  // 新しいログが追加されたら下に自動スクロール
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentLength = allItems.length;
    if (currentLength > prevItemsLengthRef.current) {
      // 新しいアイテムが追加された場合、下にスクロール
      container.scrollTop = container.scrollHeight;
    }
    prevItemsLengthRef.current = currentLength;
  }, [allItems.length]);

  // 初回表示時に下にスクロール
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoading) return;

    // 初回ロード完了後、下にスクロール
    container.scrollTop = container.scrollHeight;
  }, [isLoading]);

  const runningCount = allItems.filter((item) => item.success === null).length;

  return (
    <div className="space-y-2">
      {/* タイトル */}
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">
          リアルタイムログ
        </h3>
        {runningCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {runningCount} 実行中
          </span>
        )}
      </div>

      {/* ターミナル風ログエリア */}
      <div
        ref={scrollContainerRef}
        className="h-48 overflow-y-auto rounded-lg bg-slate-800 p-4"
      >
        <LogContent
          isLoading={isLoading}
          logEntries={logEntries}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
        />
      </div>
    </div>
  );
};
