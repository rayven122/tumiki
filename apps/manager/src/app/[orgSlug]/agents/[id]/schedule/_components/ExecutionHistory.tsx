"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { AgentId } from "@/schema/ids";

type ExecutionHistoryProps = {
  agentId: AgentId;
};

export const ExecutionHistory = ({ agentId }: ExecutionHistoryProps) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.v2.agentExecution.findByAgentId.useInfiniteQuery(
      { agentId, limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-gray-500">実行履歴がありません</p>
        <p className="text-sm text-gray-400">
          スケジュールが実行されると、ここに履歴が表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {allItems.map((execution) => (
          <div
            key={execution.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              {execution.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="text-sm font-medium">
                  {execution.scheduleName ?? "手動実行"}
                </div>
                <div className="text-xs text-gray-500">
                  {format(
                    new Date(execution.createdAt),
                    "yyyy/MM/dd HH:mm:ss",
                    {
                      locale: ja,
                    },
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {execution.durationMs
                ? `${(execution.durationMs / 1000).toFixed(1)}秒`
                : "-"}
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            もっと見る
          </Button>
        </div>
      )}
    </div>
  );
};
