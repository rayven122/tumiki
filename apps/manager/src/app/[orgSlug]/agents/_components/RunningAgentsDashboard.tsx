"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useState } from "react";

import { McpServerIcon } from "../../mcps/_components/McpServerIcon";

/** ポーリング間隔（3秒） */
const POLLING_INTERVAL_MS = 3000;

/** 進捗更新間隔（100ms - スムーズなアニメーション用） */
const PROGRESS_UPDATE_INTERVAL_MS = 100;

/** 進捗率を計算 */
const calculateProgress = (
  createdAt: Date,
  estimatedDurationMs: number,
): number => {
  const elapsedMs = Date.now() - createdAt.getTime();
  return Math.min((elapsedMs / estimatedDurationMs) * 100, 99);
};

/** 経過時間をフォーマット */
const formatElapsed = (createdAt: Date): string =>
  formatDistanceToNow(createdAt, { addSuffix: false, locale: ja });

/** パルスインジケーター（稼働中を示すアニメーション） */
const PulseIndicator = () => (
  <span className="relative flex h-3 w-3 shrink-0">
    <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
    <span className="relative h-3 w-3 rounded-full bg-green-500" />
  </span>
);

type RunningAgentCardProps = {
  execution: {
    id: string;
    agentName: string;
    agentIconPath: string | null;
    scheduleName: string | null;
    estimatedDurationMs: number;
    createdAt: Date;
  };
};

/** 稼働中エージェントカード */
const RunningAgentCard = ({ execution }: RunningAgentCardProps) => {
  const [progress, setProgress] = useState(() =>
    calculateProgress(execution.createdAt, execution.estimatedDurationMs),
  );

  // 進捗をスムーズに更新
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(
        calculateProgress(execution.createdAt, execution.estimatedDurationMs),
      );
    }, PROGRESS_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [execution.createdAt, execution.estimatedDurationMs]);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
      <PulseIndicator />

      {/* エージェント情報 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {execution.agentIconPath && (
            <McpServerIcon
              iconPath={execution.agentIconPath}
              alt={execution.agentName}
              size={20}
            />
          )}
          <span className="truncate font-medium">{execution.agentName}</span>
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          開始: {formatElapsed(execution.createdAt)}前
          {execution.scheduleName && ` • ${execution.scheduleName}`}
        </div>
      </div>

      {/* 進捗バーとパーセンテージ */}
      <div className="flex w-24 shrink-0 items-center gap-2">
        <Progress value={progress} className="h-2 flex-1" />
        <span className="w-10 text-right text-sm font-medium text-green-600">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

/** 稼働中エージェントダッシュボード */
export const RunningAgentsDashboard = () => {
  const { data: runningExecutions } =
    api.v2.agentExecution.getAllRunning.useQuery(undefined, {
      refetchInterval: POLLING_INTERVAL_MS,
    });

  if (!runningExecutions?.length) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PulseIndicator />
          稼働中のエージェント
          <span className="ml-1 text-sm font-normal text-gray-500">
            ({runningExecutions.length}件)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {runningExecutions.map((execution) => (
          <RunningAgentCard
            key={execution.id}
            execution={{
              ...execution,
              createdAt: new Date(execution.createdAt),
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
};
