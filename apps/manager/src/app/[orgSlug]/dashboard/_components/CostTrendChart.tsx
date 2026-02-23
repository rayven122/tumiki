"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/features/analytics/components/Chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { type TimeRange, TIME_RANGE_LABELS } from "@/features/dashboard/utils";

const CHART_CONFIG = {
  cost: {
    label: "コスト",
    color: "var(--dashboard-chart-primary)",
  },
};

type CostTrendChartProps = {
  timeRange: TimeRange;
};

export const CostTrendChart = ({ timeRange }: CostTrendChartProps) => {
  const { data, isLoading } = api.dashboard.getCostTrendData.useQuery({
    timeRange,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!data || data.data.length === 0) {
      return (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          データがありません
        </div>
      );
    }

    return (
      <ChartContainer config={CHART_CONFIG} className="h-40 w-full">
        <AreaChart data={data.data}>
          <defs>
            <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-cost)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="var(--color-cost)"
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
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={30}
            tickFormatter={(value: number) => `$${value}`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            dataKey="cost"
            type="monotone"
            stroke="var(--color-cost)"
            strokeWidth={2}
            fill="url(#fillCost)"
          />
        </AreaChart>
      </ChartContainer>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="text-muted-foreground h-4 w-4" />
          コスト推移
          <span className="text-muted-foreground text-sm font-normal">
            （過去{TIME_RANGE_LABELS[timeRange]}）
          </span>
        </CardTitle>
        {data && (
          <p className="text-muted-foreground text-xs">
            合計: ${data.totalCost.toFixed(2)} / 入力:{" "}
            {data.totalInputTokens.toLocaleString()}トークン / 出力:{" "}
            {data.totalOutputTokens.toLocaleString()}トークン
          </p>
        )}
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};
