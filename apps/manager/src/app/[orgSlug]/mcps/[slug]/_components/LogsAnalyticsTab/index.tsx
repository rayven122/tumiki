"use client";

import { useState, useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/features/analytics/components/Chart";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@tumiki/ui/button";
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

// メソッドフィルターの型定義
type MethodFilter = "all" | "tools/call" | "tools/list";

export const LogsAnalyticsTab = ({
  serverId,
  requestStats,
}: LogsAnalyticsTabProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  // リロード時に日付範囲を再計算するためのキー
  const [refreshKey, setRefreshKey] = useState(0);
  // メソッドフィルター（すべて / tools/call / tools/list）
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  // useMemoでメモ化して、timeRangeが変更されない限り同じオブジェクトを返す
  const daysAndTimezone = useMemo(
    () => getDaysAndTimezoneFromTimeRange(timeRange),
    [timeRange],
  );

  // refreshKeyが変わると現在時刻を基準に日付範囲を再計算
  const dateRange = useMemo(
    () => getDateRangeFromTimeRange(timeRange),
    [timeRange, refreshKey],
  );

  // リクエストログ一覧を取得（ページネーション対応）
  const {
    data: logsData,
    isLoading,
    isFetching,
  } = api.userMcpServerRequestLog.findRequestLogs.useQuery(
    {
      userMcpServerId: serverId,
      page: currentPage,
      pageSize,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      // "all"の場合はundefinedを渡してフィルターなし
      method: methodFilter === "all" ? undefined : methodFilter,
    },
    {
      enabled: !!serverId,
      // フィルター変更時に前のデータを保持（ローディング中のちらつき防止）
      placeholderData: keepPreviousData,
    },
  );

  // グラフ用の統計データを取得（日別または時間別）
  const { data: statsData } =
    api.userMcpServerRequestLog.getRequestLogsStats.useQuery(
      {
        userMcpServerId: serverId,
        days: daysAndTimezone.days,
        timezone: daysAndTimezone.timezone,
        granularity: daysAndTimezone.granularity,
      },
      { enabled: !!serverId },
    );

  const successRate = calculateSuccessRate(requestStats);
  const errorPercentage = calculateErrorPercentage(requestStats);

  // グラフデータを生成（24時間は時間別、それ以外は日別）
  const { dailyData, hourlyData } = convertDailyStatsToChartData(statsData);
  const chartData = timeRange === "24h" ? hourlyData : dailyData;

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">リクエストログ</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // refreshKeyを更新して日付範囲を再計算し、最新データを取得
                setRefreshKey((prev) => prev + 1);
                setCurrentPage(1);
              }}
              disabled={isFetching}
              className="h-8 w-8"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* メソッドフィルター */}
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <Button
                variant={methodFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setMethodFilter("all");
                  setCurrentPage(1);
                }}
                className="h-7 rounded-md px-3 text-xs"
              >
                すべて
              </Button>
              <Button
                variant={methodFilter === "tools/call" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setMethodFilter("tools/call");
                  setCurrentPage(1);
                }}
                className="h-7 rounded-md px-3 font-mono text-xs"
              >
                tools/call
              </Button>
              <Button
                variant={methodFilter === "tools/list" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setMethodFilter("tools/list");
                  setCurrentPage(1);
                }}
                className="h-7 rounded-md px-3 font-mono text-xs"
              >
                tools/list
              </Button>
            </div>
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
