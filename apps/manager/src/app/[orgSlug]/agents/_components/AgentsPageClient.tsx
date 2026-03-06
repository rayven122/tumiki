"use client";

import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { REALTIME_LOG_POLLING_MS } from "@/features/agents/constants";
import { api } from "@/trpc/react";
import { Bot, Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getSessionInfo } from "~/lib/auth/session-utils";

import { AgentCardList } from "./AgentCardList";
import { EmptyState } from "./EmptyState";
import { RealtimeLogPanel } from "./RealtimeLogPanel";
import { RunningAgentsDashboard } from "./RunningAgentsDashboard";

type AgentsPageClientProps = {
  orgSlug: string;
};

/**
 * エージェント一覧ページのクライアントコンポーネント
 */
export const AgentsPageClient = ({ orgSlug }: AgentsPageClientProps) => {
  const { data: session } = useSession();
  const isAdmin = getSessionInfo(session).isAdmin;

  const [searchQuery, setSearchQuery] = useState("");

  const { data: agents } = api.agent.findAll.useQuery();
  const agentCount = agents?.length ?? 0;

  // 統合クエリ: 直近の実行履歴を取得（稼働中ダッシュボード + リアルタイムログ用）
  const {
    data: recentExecutionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingExecutions,
  } = api.agentExecution.getRecent.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: REALTIME_LOG_POLLING_MS,
    },
  );

  // 全実行データをフラット化
  const allExecutions = useMemo(
    () => recentExecutionsData?.pages.flatMap((page) => page.items) ?? [],
    [recentExecutionsData],
  );

  // 稼働中の実行（success === null）をフィルタ
  const runningExecutions = useMemo(
    () => allExecutions.filter((exec) => exec.success === null),
    [allExecutions],
  );

  const clearSearchQuery = () => {
    setSearchQuery("");
  };

  const hasActiveFilters = searchQuery.length > 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">AIエージェント</h1>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href={`/${orgSlug}/agents/create`}>
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        )}
      </div>

      {/* 検索バー */}
      {agentCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="エージェントを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearSearchQuery}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      )}

      {/* 稼働中エージェントダッシュボード */}
      <div className="mb-6">
        <RunningAgentsDashboard executions={runningExecutions} />
      </div>

      {/* リアルタイムログ */}
      <div className="mb-6">
        <RealtimeLogPanel
          executions={allExecutions}
          isLoading={isLoadingExecutions}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </div>

      {/* エージェント一覧または空状態 */}
      <div>
        {agentCount === 0 ? (
          <EmptyState isAdmin={isAdmin} orgSlug={orgSlug} />
        ) : (
          <AgentCardList searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
};
