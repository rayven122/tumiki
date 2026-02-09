"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Activity, Bot, Server, AlertTriangle } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type Stats = RouterOutputs["v2"]["dashboard"]["getStats"];

type StatsCardsProps = {
  stats: Stats;
};

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    {
      title: "稼働中エージェント",
      value: stats.runningAgentCount,
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: stats.runningAgentCount > 0 ? "実行中" : "なし",
    },
    {
      title: "今日の実行",
      value: stats.todayExecutionCount,
      icon: Bot,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: `成功: ${stats.todaySuccessCount} / 失敗: ${stats.todayErrorCount}`,
    },
    {
      title: "MCPリクエスト",
      value: stats.last24hMcpRequestCount,
      icon: Server,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "過去24時間",
    },
    {
      title: "エラー率",
      value: `${stats.mcpErrorRate}%`,
      icon: AlertTriangle,
      color: stats.mcpErrorRate > 5 ? "text-red-500" : "text-gray-500",
      bgColor: stats.mcpErrorRate > 5 ? "bg-red-500/10" : "bg-gray-500/10",
      description: "過去24時間のMCP",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground truncate text-xs">
                    {card.title}
                  </p>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {card.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
