"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Badge } from "@tumiki/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/features/analytics/components/Chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "@/trpc/react";
import {
  type TimeRange,
  TIME_RANGE_LABELS,
  getPiiTypeLabel,
} from "@/features/dashboard/utils";
import type { ChartDataPoint } from "@/features/dashboard/api/schemas";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

const CHART_CONFIG = {
  successCount: {
    label: "検知あり",
    color: "var(--dashboard-chart-primary)",
  },
  errorCount: {
    label: "検知なし",
    color: "var(--dashboard-chart-secondary)",
  },
};

export const PiiDetectionSection = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  const { data: piiStats, isLoading } = api.dashboard.getPiiStats.useQuery({
    timeRange,
  });

  if (
    !isLoading &&
    piiStats?.totalDetections === 0 &&
    piiStats.maskedRequestCount === 0
  ) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            機密情報検知
          </h2>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <ShieldCheck className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                PII検知対象のリクエストはありません
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          機密情報検知
        </h2>
        <Select
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as TimeRange)}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24時間</SelectItem>
            <SelectItem value="7d">7日間</SelectItem>
            <SelectItem value="30d">30日間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="総検知数"
          value={piiStats?.totalDetections}
          isLoading={isLoading}
        />
        <SummaryCard
          title="リクエスト検知"
          value={piiStats?.requestDetections}
          isLoading={isLoading}
        />
        <SummaryCard
          title="レスポンス検知"
          value={piiStats?.responseDetections}
          isLoading={isLoading}
        />
      </div>

      {piiStats && piiStats.infoTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">検知された情報種別</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {piiStats.infoTypeBreakdown.map(({ infoType, count }) => (
                <Badge key={infoType} variant="secondary" className="gap-1">
                  {getPiiTypeLabel(infoType)}
                  <span className="text-muted-foreground font-normal">
                    ({count})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            PII検知トレンド
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              （過去{TIME_RANGE_LABELS[timeRange]}）
            </span>
          </CardTitle>
          {piiStats && (
            <p className="text-muted-foreground text-xs">
              マスキング対象: {piiStats.maskedRequestCount}件 / 検知:{" "}
              {piiStats.trendData.successTotal}件
            </p>
          )}
        </CardHeader>
        <CardContent>
          <TrendChart
            isLoading={isLoading}
            data={piiStats?.trendData.data ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
};

type SummaryCardProps = {
  title: string;
  value: number | undefined;
  isLoading: boolean;
};

const SummaryCard = ({ title, value, isLoading }: SummaryCardProps) => (
  <Card>
    <CardContent className="pt-4">
      <p className="text-muted-foreground text-sm">{title}</p>
      {isLoading ? (
        <Loader2 className="text-muted-foreground mt-1 h-5 w-5 animate-spin" />
      ) : (
        <p className="text-2xl font-bold">{value ?? 0}</p>
      )}
    </CardContent>
  </Card>
);

type TrendChartProps = {
  isLoading: boolean;
  data: ChartDataPoint[];
};

const TrendChart = ({ isLoading, data }: TrendChartProps) => {
  if (isLoading) {
    return (
      <div className="flex h-36 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-36 items-center justify-center text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ChartContainer config={CHART_CONFIG} className="h-36 w-full">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fillPiiDetected" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-successCount)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-successCount)"
              stopOpacity={0.02}
            />
          </linearGradient>
          <linearGradient id="fillPiiClean" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-errorCount)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-errorCount)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          fontSize={11}
        />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="successCount"
          type="monotone"
          stroke="var(--color-successCount)"
          strokeWidth={2}
          fill="url(#fillPiiDetected)"
          stackId="a"
        />
        <Area
          dataKey="errorCount"
          type="monotone"
          stroke="var(--color-errorCount)"
          strokeWidth={2}
          fill="url(#fillPiiClean)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
};
