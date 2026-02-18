import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { RequestStats } from "../types";

type RequestStatsCardProps = {
  requestStats?: RequestStats;
};

export const RequestStatsCard = ({ requestStats }: RequestStatsCardProps) => {
  // 7日間のデータを基準に計算
  const last7dRequests = requestStats?.last7dRequests ?? 0;
  const totalRequests = requestStats?.totalRequests ?? 0;
  const successRate =
    totalRequests > 0
      ? ((requestStats?.successRequests ?? 0) / totalRequests) * 100
      : 0;
  const avgDuration = requestStats?.averageDurationMs ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          リクエスト統計
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">7日間のリクエスト:</span>
            <span className="text-lg font-semibold">
              {last7dRequests.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">成功率:</span>
            <span
              className={`text-lg font-semibold ${
                successRate >= 95
                  ? "text-green-600"
                  : successRate >= 80
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {successRate.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">平均応答時間:</span>
            <span className="text-lg font-semibold">
              {avgDuration.toFixed(0)}ms
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
