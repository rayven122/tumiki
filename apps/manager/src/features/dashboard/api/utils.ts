import {
  subDays,
  subHours,
  format,
  eachDayOfInterval,
  eachHourOfInterval,
} from "date-fns";
import type { TimeRange } from "./schemas";

// 集計用のデータポイント型
export type DataPoint = {
  count: number;
  successCount: number;
  errorCount: number;
};

// 時間範囲から開始日時を計算
export const calculateStartDate = (timeRange: TimeRange, now: Date): Date => {
  switch (timeRange) {
    case "24h":
      return subHours(now, 24);
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
  }
};

// 空のデータポイントを初期化したMapを生成
export const initializeDataMap = (
  timeRange: TimeRange,
  startDate: Date,
  now: Date,
): Map<string, DataPoint> => {
  const dataMap = new Map<string, DataPoint>();
  const emptyDataPoint = (): DataPoint => ({
    count: 0,
    successCount: 0,
    errorCount: 0,
  });

  if (timeRange === "24h") {
    eachHourOfInterval({ start: startDate, end: now }).forEach((hour) => {
      dataMap.set(format(hour, "HH"), emptyDataPoint());
    });
  } else {
    eachDayOfInterval({ start: startDate, end: now }).forEach((day) => {
      dataMap.set(format(day, "M/d"), emptyDataPoint());
    });
  }

  return dataMap;
};

// 日時からラベルを生成
export const formatLabel = (date: Date, isHourly: boolean): string =>
  isHourly ? format(date, "HH") : format(date, "M/d");

// Mapを配列に変換し集計結果を返す
export const buildChartResult = (
  dataMap: Map<string, DataPoint>,
  totals: { total: number; successTotal: number; errorTotal: number },
) => ({
  data: Array.from(dataMap.entries()).map(([label, stats]) => ({
    label,
    ...stats,
  })),
  ...totals,
});

/**
 * ログ配列を集計してグラフデータを生成
 *
 * @param logs - 集計対象のログ配列
 * @param timeRange - 時間範囲
 * @param isSuccess - 成功判定関数
 */
export const aggregateChartData = <T extends { createdAt: Date }>(
  logs: T[],
  timeRange: TimeRange,
  isSuccess: (log: T) => boolean,
) => {
  const now = new Date();
  const isHourly = timeRange === "24h";
  const startDate = calculateStartDate(timeRange, now);
  const dataMap = initializeDataMap(timeRange, startDate, now);

  let total = 0;
  let successTotal = 0;
  let errorTotal = 0;

  for (const log of logs) {
    const label = formatLabel(log.createdAt, isHourly);
    const existing = dataMap.get(label);
    if (!existing) continue;

    existing.count++;
    total++;

    if (isSuccess(log)) {
      existing.successCount++;
      successTotal++;
    } else {
      existing.errorCount++;
      errorTotal++;
    }
  }

  return buildChartResult(dataMap, { total, successTotal, errorTotal });
};
