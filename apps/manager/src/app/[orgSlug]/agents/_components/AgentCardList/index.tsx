"use client";

import { api } from "@/trpc/react";
import { Suspense, useMemo } from "react";

import { AgentCard } from "../AgentCard";

// グリッドレイアウトのスタイル定義
const GRID_STYLES =
  "grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";

// 空状態コンテナのスタイル定義
const EMPTY_CONTAINER_STYLES =
  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12";

type AgentCardListProps = {
  searchQuery: string;
};

/**
 * 検索クエリが一致するか判定
 */
const matchesSearchQuery = (
  agent: { name: string; description: string | null },
  query: string,
): boolean => {
  const lowerQuery = query.toLowerCase();
  return (
    agent.name.toLowerCase().includes(lowerQuery) ||
    (agent.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
};

/**
 * エージェント一覧の非同期コンポーネント
 */
const AsyncAgentCardList = ({ searchQuery }: AgentCardListProps) => {
  const [agents] = api.agent.findAll.useSuspenseQuery();
  const utils = api.useUtils();

  const filteredAgents = useMemo(
    () => agents.filter((agent) => matchesSearchQuery(agent, searchQuery)),
    [agents, searchQuery],
  );

  // エージェントが存在しない場合
  if (agents.length === 0) {
    return (
      <div className={EMPTY_CONTAINER_STYLES}>
        <div className="mb-4 text-6xl">🤖</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          エージェントがありません
        </h3>
        <p className="mb-4 text-center text-sm text-gray-600">
          「新規作成」からエージェントを作成してください
        </p>
      </div>
    );
  }

  // フィルタリング結果が0件の場合
  if (filteredAgents.length === 0) {
    return (
      <div className={EMPTY_CONTAINER_STYLES}>
        <div className="mb-4 text-6xl">🔍</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          該当するエージェントが見つかりません
        </h3>
        <p className="mb-4 text-center text-sm text-gray-600">
          検索条件を変更してみてください
        </p>
      </div>
    );
  }

  const handleRevalidate = async () => {
    await utils.agent.findAll.invalidate();
  };

  return (
    <div className={GRID_STYLES}>
      {filteredAgents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} revalidate={handleRevalidate} />
      ))}
    </div>
  );
};

// スケルトンアイテム数
const SKELETON_COUNT = 6;

/**
 * スケルトンローダー
 */
const AgentCardListSkeleton = () => (
  <div className={GRID_STYLES}>
    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
      <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
    ))}
  </div>
);

/**
 * エージェントカード一覧コンポーネント
 */
export const AgentCardList = ({ searchQuery }: AgentCardListProps) => (
  <Suspense fallback={<AgentCardListSkeleton />}>
    <AsyncAgentCardList searchQuery={searchQuery} />
  </Suspense>
);
