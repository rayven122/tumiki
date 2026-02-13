"use client";

import { api } from "@/trpc/react";
import { StatsCards } from "./StatsCards";
import { RunningAgents } from "./RunningAgents";
import { RecentExecutions } from "./RecentExecutions";
import { QuickActions } from "./QuickActions";
import { ActivityCharts } from "./ActivityCharts";

type DashboardClientProps = {
  orgSlug: string;
};

export const DashboardClient = ({ orgSlug }: DashboardClientProps) => {
  // 統計データを取得
  const [stats] = api.dashboard.getStats.useSuspenseQuery();

  // 稼働中エージェントを取得
  const [runningAgents] = api.agentExecution.getAllRunning.useSuspenseQuery();

  // 最近の実行履歴を取得
  const [recentExecutions] = api.dashboard.getRecentExecutions.useSuspenseQuery(
    {
      limit: 5,
    },
  );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm">
          組織の概要とアクティビティを確認できます
        </p>
      </div>

      {/* 統計カード */}
      <StatsCards stats={stats} />

      {/* アクティビティチャート */}
      <ActivityCharts />

      {/* 稼働中エージェント */}
      {runningAgents.length > 0 && (
        <RunningAgents agents={runningAgents} orgSlug={orgSlug} />
      )}

      {/* 最近の実行履歴とクイックアクション */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <RecentExecutions executions={recentExecutions} orgSlug={orgSlug} />
        </div>
        <div>
          <QuickActions orgSlug={orgSlug} />
        </div>
      </div>
    </div>
  );
};
