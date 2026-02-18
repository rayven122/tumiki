"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle } from "lucide-react";
import type { RequestStats } from "../types";

type StatsCardsProps = {
  requestStats?: RequestStats;
};

export const StatsCards = ({ requestStats }: StatsCardsProps) => {
  const totalRequests = requestStats?.totalRequests ?? 0;
  const successRequests = requestStats?.successRequests ?? 0;
  const errorRequests = requestStats?.errorRequests ?? 0;
  const averageDurationMs = requestStats?.averageDurationMs ?? 0;
  const successRate =
    totalRequests > 0 ? Math.round((successRequests / totalRequests) * 100) : 0;

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
              <span className="text-sm text-gray-600">総リクエスト数:</span>
              <span className="text-sm font-semibold">{totalRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">成功率:</span>
              <span className="text-sm font-semibold text-green-600">
                {successRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">平均応答時間:</span>
              <span className="text-sm font-semibold">
                {Math.round(averageDurationMs)}ms
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
              <span className="text-sm text-gray-600">成功:</span>
              <span className="text-sm font-semibold text-green-600">
                {successRequests}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">エラー:</span>
              <span className="text-sm font-semibold text-red-600">
                {errorRequests}
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
