"use client";

import { Card, CardContent } from "@tumiki/ui/card";
import { Server, AlertTriangle, Clock } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type Stats = RouterOutputs["dashboard"]["getStats"];

type StatsCardsProps = {
  stats: Stats;
};

const formatTimeUntil = (minutes: number): string => {
  if (minutes < 0) {
    return "まもなく";
  }
  if (minutes < 1) {
    return "1分以内";
  }
  if (minutes < 60) {
    return `あと${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `あと${hours}時間${remainingMinutes}分`
      : `あと${hours}時間`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0
    ? `あと${days}日${remainingHours}時間`
    : `あと${days}日`;
};

// 前日/前月比のパーセンテージ変化を計算
const calcChangePercent = (
  current: number,
  previous: number,
): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
};

type TrendIndicatorProps = {
  changePercent: number | null;
};

const TrendIndicator = ({ changePercent }: TrendIndicatorProps) => {
  if (changePercent === null) return null;

  if (changePercent > 0) {
    return (
      <span className="text-dashboard-success ml-1 text-xs font-normal">
        ↑{changePercent}%
      </span>
    );
  }
  if (changePercent < 0) {
    return (
      <span className="text-dashboard-error ml-1 text-xs font-normal">
        ↓{Math.abs(changePercent)}%
      </span>
    );
  }
  return (
    <span className="text-muted-foreground ml-1 text-xs font-normal">→0%</span>
  );
};

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const { nextSchedule } = stats;

  const executionChange = calcChangePercent(
    stats.todayExecutionCount,
    stats.yesterdayExecutionCount,
  );

  const costChange =
    stats.monthlyEstimatedCost !== null && stats.lastMonthEstimatedCost !== null
      ? calcChangePercent(
          stats.monthlyEstimatedCost,
          stats.lastMonthEstimatedCost,
        )
      : null;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">
              稼働中エージェント
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold tabular-nums">
                {stats.runningAgentCount}
              </p>
              {stats.runningAgentCount > 0 && (
                <span className="bg-dashboard-success inline-block h-2 w-2 rounded-full" />
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              全{stats.agentCount}台中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">
              今日の実行
            </p>
            <div className="mt-1 flex items-baseline">
              <p className="text-2xl font-bold tabular-nums">
                {stats.todayExecutionCount}
              </p>
              <TrendIndicator changePercent={executionChange} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="text-dashboard-success">
                {stats.todaySuccessCount}
              </span>
              <span> 成功 / </span>
              <span className="text-dashboard-error">
                {stats.todayErrorCount}
              </span>
              <span> 失敗</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">
              今月のコスト
            </p>
            <div className="mt-1 flex items-baseline">
              <p className="text-2xl font-bold tabular-nums">
                {stats.monthlyEstimatedCost !== null
                  ? `$${stats.monthlyEstimatedCost.toFixed(2)}`
                  : "-"}
              </p>
              <TrendIndicator changePercent={costChange} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {stats.monthlyEstimatedCost !== null ? "推定API使用料" : "準備中"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5">
            <Server className="text-muted-foreground h-3.5 w-3.5" />
            <p className="text-muted-foreground text-xs">MCPリクエスト (24h)</p>
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {stats.last24hMcpRequestCount}
            <span className="text-muted-foreground text-xs font-normal">
              件
            </span>
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="text-muted-foreground h-3.5 w-3.5" />
            <p className="text-muted-foreground text-xs">エラー率</p>
          </div>
          <p
            className={`mt-1 text-lg font-semibold tabular-nums ${
              stats.mcpErrorRate > 5 ? "text-destructive" : ""
            }`}
          >
            {stats.mcpErrorRate}
            <span className="text-muted-foreground text-xs font-normal">%</span>
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5">
            <Clock className="text-muted-foreground h-3.5 w-3.5" />
            <p className="text-muted-foreground text-xs">次の実行予定</p>
          </div>
          <p className="mt-1 truncate text-lg font-semibold">
            {nextSchedule
              ? formatTimeUntil(nextSchedule.minutesUntilNextRun)
              : "なし"}
          </p>
          {nextSchedule?.agentName && (
            <p className="text-muted-foreground truncate text-xs">
              {nextSchedule.agentName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
