"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Activity, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { RequestStats } from "../types";
import { StatsCard } from "./StatsCard";
import { RequestLogsTable } from "./RequestLogsTable";
import {
  calculateSuccessRate,
  calculateErrorPercentage,
  convertDailyStatsToChartData,
  getTimeRangeLabel,
  getDaysAndTimezoneFromTimeRange,
  getDateRangeFromTimeRange,
  type TimeRange,
} from "./utils";
import { api } from "@/trpc/react";
import type { McpServerId } from "@/schema/ids";

type LogsAnalyticsTabProps = {
  serverId: McpServerId;
  requestStats?: RequestStats;
};

export const LogsAnalyticsTab = ({
  serverId,
  requestStats,
}: LogsAnalyticsTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // useMemoでメモ化して、timeRangeが変更されない限り同じオブジェクトを返す
  const daysAndTimezone = useMemo(
    () => getDaysAndTimezoneFromTimeRange(timeRange),
    [timeRange],
  );

  const dateRange = useMemo(
    () => getDateRangeFromTimeRange(timeRange),
    [timeRange],
  );

  // リクエストログ一覧を取得（ページネーション対応）
  const { data: logsData, isLoading } =
    api.v2.userMcpServerRequestLog.findRequestLogs.useQuery(
      {
        userMcpServerId: serverId,
        page: currentPage,
        pageSize,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      { enabled: !!serverId },
    );

  // グラフ用の日別統計データを取得
  const { data: statsData } =
    api.v2.userMcpServerRequestLog.getRequestLogsStats.useQuery(
      {
        userMcpServerId: serverId,
        days: daysAndTimezone.days,
        timezone: daysAndTimezone.timezone,
      },
      { enabled: !!serverId },
    );

  const successRate = calculateSuccessRate(requestStats);
  const errorPercentage = calculateErrorPercentage(requestStats);

  // グラフデータを生成（24時間表示も日別データを使用）
  const chartData = convertDailyStatsToChartData(statsData).dailyData;

  const chartConfig = {
    count: {
      label: "リクエスト数",
      color: "hsl(217, 91%, 60%)", // 明るい青色
    },
  };

  const totalPages = logsData?.pageInfo.totalPages ?? 0;
  const totalItems = logsData?.pageInfo.totalCount ?? 0;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="space-y-6">
      {/* 分析セクション */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">分析・統計</h2>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24時間</SelectItem>
              <SelectItem value="7d">7日間</SelectItem>
              <SelectItem value="30d">30日間</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="総リクエスト数"
            icon={Activity}
            value={requestStats?.totalRequests ?? 0}
            description={`過去7日間: ${requestStats?.last7dRequests ?? 0}件`}
          />
          <StatsCard
            title="成功率"
            icon={CheckCircle}
            value={`${successRate}%`}
            description={`成功: ${requestStats?.successRequests ?? 0}件 / 全体: ${requestStats?.totalRequests ?? 0}件`}
          />
          <StatsCard
            title="平均応答時間"
            icon={Clock}
            value={`${requestStats?.averageDurationMs ?? 0}ms`}
            description="全リクエストの平均処理時間"
          />
          <StatsCard
            title="エラー数"
            icon={AlertCircle}
            value={requestStats?.errorRequests ?? 0}
            description={
              requestStats?.totalRequests
                ? `全体の${errorPercentage}%`
                : "データなし"
            }
          />
        </div>

        {/* リクエスト推移チャート */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              リクエスト推移（過去{getTimeRangeLabel(timeRange)}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey={timeRange === "24h" ? "hour" : "day"}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value: string | number) =>
                    timeRange === "24h" ? `${value}時` : String(value)
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value: string | number) =>
                        timeRange === "24h" ? `${value}時` : String(value)
                      }
                    />
                  }
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ログセクション */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">リクエストログ</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">表示件数:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10件</SelectItem>
                <SelectItem value="25">25件</SelectItem>
                <SelectItem value="50">50件</SelectItem>
                <SelectItem value="100">100件</SelectItem>
                <SelectItem value="200">200件</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <RequestLogsTable
          logs={logsData?.data ?? []}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
