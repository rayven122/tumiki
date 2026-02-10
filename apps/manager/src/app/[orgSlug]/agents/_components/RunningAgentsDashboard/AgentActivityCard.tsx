"use client";

import { Button } from "@/components/ui/button";
import {
  PROGRESS_UPDATE_INTERVAL_MS,
  PROGRESS_WARNING_THRESHOLD,
  calculateProgress,
} from "@/lib/agent";
import { Activity, AlertTriangle, Bot, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { McpServerIcon } from "../../../mcps/_components/McpServerIcon";
import { formatElapsedTime, formatStartTime } from "./timeUtils";
import type { ExecutionData } from "./types";

/** パルスアニメーション付き円形アイコン */
const PulseCircleIcon = ({ isWarning = false }: { isWarning?: boolean }) => {
  const colorClass = isWarning
    ? "bg-orange-500"
    : "bg-gradient-to-br from-emerald-400 to-emerald-600";
  const pulseColorClass = isWarning ? "bg-orange-400" : "bg-emerald-400";

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      {/* 外側のパルスリング */}
      <span
        className={`absolute h-full w-full animate-ping rounded-full opacity-20 ${pulseColorClass}`}
      />
      {/* 内側のパルスリング */}
      <span
        className={`absolute h-10 w-10 animate-pulse rounded-full opacity-30 ${pulseColorClass}`}
      />
      {/* メインの円 */}
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${colorClass} shadow-lg`}
      >
        <Activity className="h-4 w-4 text-white" />
      </span>
    </div>
  );
};

/** エージェントアイコン */
export const AgentIcon = ({
  iconPath,
  name,
}: {
  iconPath: string | null;
  name: string;
}) => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
    {iconPath ? (
      <McpServerIcon iconPath={iconPath} alt={name} size={20} />
    ) : (
      <Bot className="h-5 w-5" />
    )}
  </div>
);

type AgentActivityCardProps = {
  execution: ExecutionData;
  onViewDetails: (execution: ExecutionData) => void;
};

/** エージェントアクティビティカード（グリッド表示用） */
export const AgentActivityCard = ({
  execution,
  onViewDetails,
}: AgentActivityCardProps) => {
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
  const isWarning = progressPercent >= PROGRESS_WARNING_THRESHOLD;

  // プログレスバーの色
  const progressColorClass = isWarning
    ? "bg-gradient-to-r from-orange-400 to-orange-500"
    : "bg-gradient-to-r from-emerald-400 to-emerald-500";

  // ステータステキスト
  const statusText = isWarning ? "推定時間を超過中..." : "データ処理中...";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
      role="article"
      aria-label={`${execution.agentName}の実行状態`}
    >
      {/* 上部: アイコンと情報 */}
      <div className="mb-4 flex items-start gap-4">
        {/* パルスアニメーション付きアイコン */}
        <PulseCircleIcon isWarning={isWarning} />

        {/* エージェント情報 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AgentIcon
              iconPath={execution.agentIconPath}
              name={execution.agentName}
            />
            <h3 className="truncate text-base font-bold text-gray-900">
              {execution.agentName}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            開始: {formatStartTime(execution.createdAt)}
          </p>
        </div>

        {/* 進捗率 */}
        <div className="text-right">
          <span
            className={`text-2xl font-bold ${isWarning ? "text-orange-600" : "text-emerald-600"}`}
          >
            {progressPercent}%
          </span>
          <p className="text-xs font-medium text-gray-400 tabular-nums">
            {elapsedTime}
          </p>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${progressColorClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ステータス行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isWarning ? (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          )}
          <span>{statusText}</span>
        </div>

        {/* 詳細ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(execution)}
          className="h-8 gap-1.5 px-3 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-700"
        >
          <Eye className="h-4 w-4" />
          <span className="text-xs">詳細</span>
        </Button>
      </div>
    </div>
  );
};
