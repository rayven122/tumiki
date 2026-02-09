"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { ExecutionModalBase } from "../[id]/_components/ExecutionModalBase";

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

/** 開始時刻をフォーマット（絶対時刻） */
const formatStartTime = (createdAt: Date): string =>
  format(createdAt, "HH:mm:ss");

/** 経過時間をフォーマット（mm:ss形式） */
const formatElapsedTime = (createdAt: Date): string => {
  const elapsedMs = Date.now() - createdAt.getTime();
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/** パルスインジケーター */
const PulseIndicator = () => (
  <span className="relative flex h-2.5 w-2.5 shrink-0">
    <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
    <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
  </span>
);

/** エージェントアイコン */
const AgentIcon = ({
  iconPath,
  name,
}: {
  iconPath: string | null;
  name: string;
}) => {
  if (iconPath) {
    return (
      <Image
        src={iconPath}
        alt={name}
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
      <span className="text-sm font-bold">{name.charAt(0)}</span>
    </div>
  );
};

type ExecutionData = {
  id: string;
  agentName: string;
  agentIconPath: string | null;
  estimatedDurationMs: number;
  createdAt: Date;
};

type RunningAgentRowProps = {
  execution: ExecutionData;
  onViewDetails: (execution: ExecutionData) => void;
};

/** 稼働中エージェント行 */
const RunningAgentRow = ({
  execution,
  onViewDetails,
}: RunningAgentRowProps) => {
  const [progress, setProgress] = useState(() =>
    calculateProgress(execution.createdAt, execution.estimatedDurationMs),
  );
  const [elapsedTime, setElapsedTime] = useState(() =>
    formatElapsedTime(execution.createdAt),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(
        calculateProgress(execution.createdAt, execution.estimatedDurationMs),
      );
      setElapsedTime(formatElapsedTime(execution.createdAt));
    }, PROGRESS_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [execution.createdAt, execution.estimatedDurationMs]);

  const progressPercent = Math.round(progress);

  return (
    <div className="flex items-center gap-4 border-b border-gray-100 bg-white px-5 py-4 last:border-b-0">
      <PulseIndicator />

      {/* アイコン */}
      <AgentIcon
        iconPath={execution.agentIconPath}
        name={execution.agentName}
      />

      {/* エージェント情報 */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-gray-900">
          {execution.agentName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-400">
          <span>開始: {formatStartTime(execution.createdAt)}</span>
          <span className="text-gray-300">•</span>
          <span className="font-mono tabular-nums">{elapsedTime}</span>
        </div>
      </div>

      {/* プログレスバーとパーセンテージ */}
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-20 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-10 text-right text-[15px] font-semibold text-emerald-600">
          {progressPercent}%
        </span>
      </div>

      {/* 詳細表示ボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails(execution)}
        className="h-8 w-8 shrink-0 p-0 text-gray-400 hover:text-gray-600"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
};

type ExecutionDetailsModalProps = {
  execution: ExecutionData | null;
  open: boolean;
  onClose: () => void;
};

/** 実行詳細モーダル（チャットUI風） */
const ExecutionDetailsModal = ({
  execution,
  open,
  onClose,
}: ExecutionDetailsModalProps) => {
  if (!execution) return null;

  const titleIcon = <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;

  const metadata = (
    <>
      <span>開始: {formatStartTime(execution.createdAt)}</span>
      <span>|</span>
      <span>経過: {formatElapsedTime(execution.createdAt)}</span>
    </>
  );

  return (
    <ExecutionModalBase
      open={open}
      onOpenChange={onClose}
      titleIcon={titleIcon}
      titleText="実行中..."
      metadata={metadata}
    >
      {/* ローディング状態 */}
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 flex items-center gap-3">
          <AgentIcon
            iconPath={execution.agentIconPath}
            name={execution.agentName}
          />
          <span className="text-lg font-semibold text-gray-900">
            {execution.agentName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>エージェントが処理中です...</span>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          実行が完了すると、結果がここに表示されます
        </p>
      </div>
    </ExecutionModalBase>
  );
};

/** 稼働中エージェントダッシュボード */
export const RunningAgentsDashboard = () => {
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionData | null>(null);

  const { data: runningExecutions } =
    api.v2.agentExecution.getAllRunning.useQuery(undefined, {
      refetchInterval: POLLING_INTERVAL_MS,
    });

  if (!runningExecutions?.length) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gray-50 shadow-sm">
        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900">
            稼働中のエージェント
          </h2>
        </div>

        {/* エージェントリスト */}
        <div className="mx-3 mb-3 divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm">
          {runningExecutions.map((execution) => (
            <RunningAgentRow
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

      {/* 詳細モーダル */}
      <ExecutionDetailsModal
        execution={selectedExecution}
        open={!!selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </>
  );
};
