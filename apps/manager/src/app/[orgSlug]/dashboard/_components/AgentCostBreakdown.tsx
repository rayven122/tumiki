"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { DollarSign, Loader2, Info } from "lucide-react";
import { api } from "@/trpc/react";
import { type TimeRange, TIME_RANGE_LABELS } from "@/features/dashboard/utils";

// ドーナツチャート用カラーパレット
const CHART_COLORS = [
  "var(--dashboard-chart-primary)",
  "var(--dashboard-chart-secondary)",
  "oklch(0.65 0.15 150)",
  "oklch(0.65 0.15 50)",
  "oklch(0.65 0.15 200)",
  "oklch(0.65 0.12 330)",
];

const formatTokens = (tokens: number): string =>
  Intl.NumberFormat("ja-JP").format(tokens);

const formatCost = (cost: number): string => `$${cost.toFixed(2)}`;

// コストが発生しているエージェントの最大表示件数
const MAX_DISPLAY = 5;

type AgentCostBreakdownProps = {
  timeRange: TimeRange;
};

export const AgentCostBreakdown = ({ timeRange }: AgentCostBreakdownProps) => {
  const params = useParams<{ orgSlug: string }>();
  const { data, isLoading } = api.dashboard.getAgentCostBreakdown.useQuery({
    timeRange,
  });

  const activeAgents = useMemo(() => {
    if (!data) return [];
    return data.agents.filter((a) => a.estimatedCost > 0);
  }, [data]);

  const topAgents = useMemo(
    () => activeAgents.slice(0, MAX_DISPLAY),
    [activeAgents],
  );

  const chartData = useMemo(() => {
    return topAgents.map((agent, i) => ({
      name: agent.agentName,
      value: agent.estimatedCost,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [topAgents]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-[160px] items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (!data || topAgents.length === 0) {
      return (
        <div className="text-muted-foreground flex h-[160px] flex-col items-center justify-center text-center">
          <DollarSign className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">データがありません</p>
        </div>
      );
    }

    const hiddenCount = activeAgents.length - topAgents.length;

    return (
      <div className="flex h-[160px] items-center gap-6">
        {/* ドーナツチャート */}
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="var(--background)"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* 中央に合計コスト */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-muted-foreground text-[10px]">合計</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCost(data.totalCost)}
            </span>
          </div>
        </div>

        {/* エージェントリスト */}
        <TooltipProvider delayDuration={200}>
          <div className="min-w-0 flex-1 space-y-0.5">
            {topAgents.map((agent, i) => (
              <Tooltip key={agent.agentId}>
                <TooltipTrigger asChild>
                  <Link
                    href={`/${params.orgSlug}/agents/${agent.agentSlug}`}
                    className="hover:bg-muted/50 flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors"
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                      {agent.agentName}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums">
                      {formatCost(agent.estimatedCost)}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    入力 {formatTokens(agent.inputTokens)} / 出力{" "}
                    {formatTokens(agent.outputTokens)}
                    {agent.mcpServerCount > 1 &&
                      ` / ${String(agent.mcpServerCount)} MCP`}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            {hiddenCount > 0 && (
              <p className="text-muted-foreground px-1 text-[11px]">
                他 {String(hiddenCount)} エージェント
              </p>
            )}
          </div>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="text-muted-foreground h-4 w-4" />
          エージェント別コスト
          <span className="text-muted-foreground text-sm font-normal">
            （過去{TIME_RANGE_LABELS[timeRange]}）
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {renderContent()}
        {data && data.agents.length > 0 && (
          <p className="text-muted-foreground mt-2 flex items-center gap-1 border-t pt-2 text-[11px]">
            <Info className="h-3 w-3 shrink-0" />
            MCPサーバー共有時は按分推計値です
          </p>
        )}
      </CardContent>
    </Card>
  );
};
