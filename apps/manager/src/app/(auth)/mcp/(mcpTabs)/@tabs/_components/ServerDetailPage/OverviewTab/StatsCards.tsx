"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle } from "lucide-react";
import type { RequestStats } from "../types";

type StatsCardsProps = {
  requestStats: RequestStats;
};

export const StatsCards = ({ requestStats }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">リクエスト統計</CardTitle>
          <Activity className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">今日のリクエスト:</span>
              <span className="text-sm font-semibold">
                {requestStats?.todayRequests ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">成功率:</span>
              <span className="text-sm font-semibold text-green-600">
                {requestStats?.successRate ?? 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">平均応答時間:</span>
              <span className="text-sm font-semibold">
                {requestStats?.avgDuration ?? 0}ms
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">接続統計</CardTitle>
          <CheckCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">総リクエスト数:</span>
              <span className="text-sm font-semibold">
                {requestStats?.totalRequests ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">エラー数:</span>
              <span className="text-sm font-semibold text-red-600">
                {requestStats?.totalErrors ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">接続状態:</span>
              <span className="text-sm font-semibold text-green-600">正常</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
