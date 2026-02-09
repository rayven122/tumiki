"use client";

import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Loader2, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

/** ポーリング間隔（3秒） */
const POLLING_INTERVAL_MS = 3000;

/** 時刻をフォーマット */
const formatTime = (date: Date): string => format(date, "HH:mm:ss");

/** ステータスアイコンを取得 */
const getStatusIcon = (
  success: boolean | null,
): { icon: string; color: string } => {
  if (success === null) return { icon: "\u25B6", color: "text-slate-100" };
  if (success) return { icon: "\u2713", color: "text-cyan-400" };
  return { icon: "\u25B3", color: "text-amber-400" };
};

/** デフォルトメッセージを取得 */
const getDefaultMessage = (success: boolean | null): string => {
  if (success === null) return "処理中...";
  if (success) return "正常に完了しました";
  return "エラーが発生しました";
};

type LogEntryProps = {
  timestamp: Date;
  agentSlug: string;
  success: boolean | null;
  message: string | null;
};

/** ログエントリコンポーネント */
const LogEntry = ({
  timestamp,
  agentSlug,
  success,
  message,
}: LogEntryProps) => {
  const { icon, color } = getStatusIcon(success);
  const displayMessage = message ?? getDefaultMessage(success);

  return (
    <div className="flex items-start gap-2 py-1 font-mono text-sm">
      <span className="shrink-0 text-slate-400">{formatTime(timestamp)}</span>
      <span className="shrink-0 text-cyan-400">[{agentSlug}]</span>
      <span className={`shrink-0 ${color}`}>{icon}</span>
      <span className="min-w-0 flex-1 truncate text-slate-100">
        {displayMessage}
      </span>
    </div>
  );
};

/**
 * リアルタイムログパネル
 * ターミナル風UIで直近の実行履歴を表示
 */
export const RealtimeLogPanel = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    api.v2.agentExecution.getRecent.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        refetchInterval: POLLING_INTERVAL_MS,
      },
    );

  // 無限スクロール: 下端に近づいたら次のページを読み込む
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];
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
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-sm text-slate-400">
            実行履歴がありません
          </div>
        ) : (
          <>
            {allItems.map((item) => (
              <LogEntry
                key={item.id}
                timestamp={new Date(item.createdAt)}
                agentSlug={item.agentSlug}
                success={item.success}
                message={item.latestMessage}
              />
            ))}
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
            {!hasNextPage && allItems.length > 0 && (
              <div className="py-2 text-center font-mono text-xs text-slate-500">
                --- ログの末尾 ---
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
