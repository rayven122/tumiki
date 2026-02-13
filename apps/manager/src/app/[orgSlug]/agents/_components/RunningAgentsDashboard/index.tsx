"use client";

import { calculateProgress } from "@/features/agents/constants";
import type { RouterOutputs } from "@/trpc/react";
import { Sparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { AgentActivityCard } from "./AgentActivityCard";
import { ExecutionDetailsModal } from "./ExecutionDetailsModal";
import type { ExecutionData } from "./types";

/** 実行データの型（getRecentのレスポンスアイテム） */
type RecentExecutionItem =
  RouterOutputs["agentExecution"]["getRecent"]["items"][number];

type RunningAgentsDashboardProps = {
  executions: RecentExecutionItem[];
};

/** ステータスバッジ */
const StatusBadge = ({
  icon,
  text,
  variant = "default",
}: {
  icon: React.ReactNode;
  text: string;
  variant?: "default" | "success" | "warning";
}) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-orange-50 text-orange-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {icon}
      {text}
    </span>
  );
};

/** 空状態の表示 */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
      <Sparkles className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-700">
      稼働中のエージェントはありません
    </h3>
    <p className="mt-2 max-w-sm text-sm text-gray-500">
      エージェントの実行を開始すると、ここでリアルタイムの進捗を確認できます。
    </p>
  </div>
);

/** 稼働中エージェントダッシュボード */
export const RunningAgentsDashboard = ({
  executions,
}: RunningAgentsDashboardProps) => {
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionData | null>(null);

  // 統計情報の計算
  const stats = useMemo(() => {
    if (!executions.length) {
      return { count: 0, averageProgress: 0 };
    }

    const progressValues = executions.map((exec) =>
      calculateProgress(new Date(exec.createdAt), exec.estimatedDurationMs),
    );
    const averageProgress = Math.round(
      progressValues.reduce((a, b) => a + b, 0) / progressValues.length,
    );

    return {
      count: executions.length,
      averageProgress,
    };
  }, [executions]);

  const hasRunningExecutions = executions.length > 0;

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-sm">
        {/* ヘッダー */}
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                稼働中のエージェント
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                リアルタイム実行モニタリング
              </p>
            </div>

            {/* ステータスバッジ */}
            {hasRunningExecutions && (
              <div className="flex items-center gap-2">
                <StatusBadge
                  icon={
                    <span className="relative flex h-2 w-2">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  }
                  text={`${stats.count} 実行中`}
                  variant="success"
                />
                <StatusBadge
                  icon={<Zap className="h-3.5 w-3.5" />}
                  text={`平均 ${stats.averageProgress}%`}
                  variant="default"
                />
              </div>
            )}
          </div>
        </div>

        {/* コンテンツ */}
        {hasRunningExecutions ? (
          <div className="p-6">
            {/* エージェントカードグリッド */}
            <div className="grid gap-4 sm:grid-cols-2">
              {executions.map((execution) => (
                <AgentActivityCard
                  key={execution.id}
                  execution={{
                    ...execution,
                    createdAt: new Date(execution.createdAt),
                  }}
                  onViewDetails={setSelectedExecution}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* 詳細モーダル */}
      <ExecutionDetailsModal
        execution={selectedExecution}
        open={!!selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </>
  );
};
