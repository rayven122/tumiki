"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { api } from "@/trpc/react";
import { isEEFeatureAvailable } from "@/features/ee/config";
import { TIME_RANGE_LABELS, type TimeRange } from "@/features/dashboard/utils";
import { StatsCards } from "./StatsCards";
import { RunningAgents } from "./RunningAgents";
import { RecentExecutions } from "./RecentExecutions";
import { QuickActions } from "./QuickActions";
import { ActivityCharts } from "./ActivityCharts";
import { AgentPerformance } from "./AgentPerformance";
import { CostTrendChart } from "./CostTrendChart";
import { AgentCostBreakdown } from "./AgentCostBreakdown";
import { McpServerHealth } from "./McpServerHealth";
import { ScheduleTimeline } from "./ScheduleTimeline";
import { PiiDetectionSection } from "./PiiDetectionSection";

type DashboardClientProps = {
  orgSlug: string;
};

export const DashboardClient = ({ orgSlug }: DashboardClientProps) => {
  const [stats] = api.dashboard.getStats.useSuspenseQuery();
  const [runningAgents] = api.agentExecution.getAllRunning.useSuspenseQuery();
  const [activityTimeRange, setActivityTimeRange] = useState<TimeRange>("7d");

  const showPiiDashboard = isEEFeatureAvailable("pii-dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          ダッシュボード
        </h1>
        <p className="text-muted-foreground text-sm">
          エージェント {stats.agentCount}台 / MCPサーバー {stats.mcpServerCount}
          台 / スケジュール {stats.scheduleCount}件
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* メインコンテンツ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">アクティビティ</h2>
            <Select
              value={activityTimeRange}
              onValueChange={(value: TimeRange) => setActivityTimeRange(value)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ActivityCharts timeRange={activityTimeRange} />

          <div className="grid gap-4 lg:grid-cols-2">
            <CostTrendChart timeRange={activityTimeRange} />
            <AgentCostBreakdown timeRange={activityTimeRange} />
          </div>

          <RecentExecutions orgSlug={orgSlug} />

          <AgentPerformance timeRange={activityTimeRange} />
        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          <QuickActions orgSlug={orgSlug} />
          {runningAgents.length > 0 && (
            <RunningAgents agents={runningAgents} orgSlug={orgSlug} />
          )}
          <ScheduleTimeline />
          <McpServerHealth />
        </div>
      </div>

      {showPiiDashboard && <PiiDetectionSection />}
    </div>
  );
};
