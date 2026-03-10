"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/features/analytics/components/Chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "@/trpc/react";
import { type TimeRange, TIME_RANGE_LABELS } from "@/features/dashboard/utils";
import type { ChartData } from "@/features/dashboard/api/schemas";
import { Server, Bot, Loader2 } from "lucide-react";

const CHART_CONFIG = {
  successCount: {
    label: "成功",
    color: "var(--dashboard-chart-primary)",
  },
  errorCount: {
    label: "エラー",
    color: "var(--dashboard-chart-secondary)",
  },
};

type ActivityChartCardProps = {
  title: string;
  icon: ReactNode;
  timeRangeLabel: string;
  data: ChartData | undefined;
  isLoading: boolean;
};

const ActivityChartCard = ({
  title,
  icon,
  timeRangeLabel,
  data,
  isLoading,
}: ActivityChartCardProps) => {
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
            <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
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
            <linearGradient id="fillError" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#fillSuccess)"
            stackId="a"
          />
          <Area
            dataKey="errorCount"
            type="monotone"
            stroke="var(--color-errorCount)"
            strokeWidth={2}
            fill="url(#fillError)"
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <span className="text-muted-foreground text-sm font-normal">
            （過去{timeRangeLabel}）
          </span>
        </CardTitle>
        {data && (
          <p className="text-muted-foreground text-xs">
            合計: {data.total}件 / 成功: {data.successTotal}件 / エラー:{" "}
            {data.errorTotal}件
          </p>
        )}
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

type ActivityChartsProps = {
  timeRange: TimeRange;
};

export const ActivityCharts = ({ timeRange }: ActivityChartsProps) => {
  const { data: mcpData, isLoading: mcpLoading } =
    api.dashboard.getMcpChartData.useQuery({ timeRange });

  const { data: agentData, isLoading: agentLoading } =
    api.dashboard.getAgentChartData.useQuery({ timeRange });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ActivityChartCard
        title="MCPリクエスト"
        icon={<Server className="text-muted-foreground h-4 w-4" />}
        timeRangeLabel={TIME_RANGE_LABELS[timeRange]}
        data={mcpData}
        isLoading={mcpLoading}
      />
      <ActivityChartCard
        title="エージェント実行"
        icon={<Bot className="text-muted-foreground h-4 w-4" />}
        timeRangeLabel={TIME_RANGE_LABELS[timeRange]}
        data={agentData}
        isLoading={agentLoading}
      />
    </div>
  );
};
