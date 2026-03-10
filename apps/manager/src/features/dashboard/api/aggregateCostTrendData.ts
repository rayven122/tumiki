import { format, eachDayOfInterval, eachHourOfInterval } from "date-fns";
import type { TimeRange } from "./schemas";
import { calculateStartDate } from "./utils";
import { calculateTokenCost } from "./tokenPricing";

// 集計関数の入力型
type RequestLogInput = {
  createdAt: Date;
  inputTokens: number | null;
  outputTokens: number | null;
};

// タイムスロットごとの集計値
type CostDataPoint = {
  cost: number;
  inputTokens: number;
  outputTokens: number;
};

// 集計結果
type CostTrendResult = {
  data: {
    label: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
  }[];
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

/**
 * MCPリクエストログからコスト推移データを集計する純粋関数
 *
 * - 時間範囲に応じて時間単位（24h）または日単位（7d/30d）で集計
 * - nullトークンは0として扱う
 * - 各タイムスロットのコストはcalculateTokenCostで計算
 */
export const aggregateCostTrendData = (
  logs: RequestLogInput[],
  timeRange: TimeRange,
): CostTrendResult => {
  const now = new Date();
  const isHourly = timeRange === "24h";
  const startDate = calculateStartDate(timeRange, now);

  // 空のデータMapを初期化
  const dataMap = new Map<string, CostDataPoint>();
  const emptyPoint = (): CostDataPoint => ({
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
  });

  if (isHourly) {
    for (const hour of eachHourOfInterval({ start: startDate, end: now })) {
      dataMap.set(format(hour, "HH"), emptyPoint());
    }
  } else {
    for (const day of eachDayOfInterval({ start: startDate, end: now })) {
      dataMap.set(format(day, "M/d"), emptyPoint());
    }
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const log of logs) {
    const label = isHourly
      ? format(log.createdAt, "HH")
      : format(log.createdAt, "M/d");
    const existing = dataMap.get(label);
    if (!existing) continue;

    const input = log.inputTokens ?? 0;
    const output = log.outputTokens ?? 0;

    existing.inputTokens += input;
    existing.outputTokens += output;
    totalInputTokens += input;
    totalOutputTokens += output;
  }

  // 各タイムスロットのコストを計算
  for (const point of dataMap.values()) {
    point.cost = calculateTokenCost(point.inputTokens, point.outputTokens);
  }

  const totalCost = calculateTokenCost(totalInputTokens, totalOutputTokens);

  return {
    data: Array.from(dataMap.entries()).map(([label, stats]) => ({
      label,
      ...stats,
    })),
    totalCost,
    totalInputTokens,
    totalOutputTokens,
  };
};
