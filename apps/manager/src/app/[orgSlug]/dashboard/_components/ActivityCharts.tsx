"use client";

import { useState, type ReactNode } from "react";
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "@/trpc/react";
import { Server, Bot, Loader2 } from "lucide-react";

type TimeRange = "24h" | "7d" | "30d";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "24時間",
  "7d": "7日間",
  "30d": "30日間",
};

const CHART_CONFIG = {
  successCount: {
    label: "成功",
    color: "hsl(142, 76%, 36%)",
  },
  errorCount: {
    label: "エラー",
    color: "hsl(0, 84%, 60%)",
  },
};

type ChartData = {
  data: {
    label: string;
    count: number;
    successCount: number;
    errorCount: number;
  }[];
  total: number;
  successTotal: number;
  errorTotal: number;
};

type ActivityChartCardProps = {
  title: string;
  icon: ReactNode;
  timeRangeLabel: string;
  data: ChartData | undefined;
  isLoading: boolean;
};

// チャートカードの共通コンポーネント
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
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!data || data.data.length === 0) {
      return (
        <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
          データがありません
        </div>
      );
    }

    return (
      <ChartContainer config={CHART_CONFIG} className="h-48 w-full">
        <BarChart data={data.data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            fontSize={11}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="successCount"
            stackId="a"
            fill="var(--color-successCount)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="errorCount"
            stackId="a"
            fill="var(--color-errorCount)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
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

export const ActivityCharts = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  const { data: mcpData, isLoading: mcpLoading } =
    api.dashboard.getMcpChartData.useQuery({ timeRange });

  const { data: agentData, isLoading: agentLoading } =
    api.dashboard.getAgentChartData.useQuery({ timeRange });

  const timeRangeLabel = TIME_RANGE_LABELS[timeRange];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">アクティビティ</h2>
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

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityChartCard
          title="MCPリクエスト"
          icon={<Server className="h-4 w-4 text-purple-500" />}
          timeRangeLabel={timeRangeLabel}
          data={mcpData}
          isLoading={mcpLoading}
        />
        <ActivityChartCard
          title="エージェント実行"
          icon={<Bot className="h-4 w-4 text-blue-500" />}
          timeRangeLabel={timeRangeLabel}
          data={agentData}
          isLoading={agentLoading}
        />
      </div>
    </div>
  );
};
