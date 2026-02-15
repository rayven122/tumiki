"use client";

import { Card, CardContent } from "@tumiki/ui/card";
import { Activity, Bot, DollarSign, Clock } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type Stats = RouterOutputs["dashboard"]["getStats"];

type StatsCardsProps = {
  stats: Stats;
};

/**
 * 残り時間を人間が読みやすい形式にフォーマット
 */
const formatTimeUntil = (minutes: number): string => {
  if (minutes < 0) {
    return "まもなく";
  }
  if (minutes < 1) {
    return "1分以内";
  }
  if (minutes < 60) {
    return `あと${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `あと${hours}時間${remainingMinutes}分`
      : `あと${hours}時間`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0
    ? `あと${days}日${remainingHours}時間`
    : `あと${days}日`;
};

/**
 * 次の実行予定の説明文を生成
 */
const formatNextSchedule = (
  nextSchedule: Stats["nextSchedule"],
): { value: string; description: string } => {
  if (!nextSchedule) {
    return { value: "なし", description: "アクティブなスケジュールなし" };
  }

  const timeUntil = formatTimeUntil(nextSchedule.minutesUntilNextRun);
  return {
    value: timeUntil,
    description: nextSchedule.agentName,
  };
};

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const nextScheduleInfo = formatNextSchedule(stats.nextSchedule);

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
      title: "今月のコスト",
      value:
        stats.monthlyEstimatedCost !== null
          ? `$${stats.monthlyEstimatedCost.toFixed(2)}`
          : "-",
      icon: DollarSign,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description:
        stats.monthlyEstimatedCost !== null ? "推定API使用料" : "準備中",
    },
    {
      title: "次の実行予定",
      value: nextScheduleInfo.value,
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: nextScheduleInfo.description,
      isTextValue: true,
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
                  <p
                    className={`font-bold ${
                      "isTextValue" in card && card.isTextValue
                        ? "truncate text-base"
                        : "text-xl"
                    }`}
                  >
                    {card.value}
                  </p>
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
