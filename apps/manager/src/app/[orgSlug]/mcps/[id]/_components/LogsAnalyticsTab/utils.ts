import type { RequestStats } from "../types";
import { subDays, subHours } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export type TimeRange = "24h" | "7d" | "30d";

type DailyData = {
  day: string;
  count: number;
};

type HourlyData = {
  hour: number;
  count: number;
};

export type DailyStatsData = {
  date: string; // YYYY-MM-DD（日別）or YYYY-MM-DD HH（時間別）
  hour?: number; // 0-23（時間別集計時のみ）
  successCount: number;
  errorCount: number;
  totalCount: number;
};

/**
 * 時間範囲を日数に変換
 */
export const timeRangeToDays = (range: TimeRange): number => {
  switch (range) {
    case "24h":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
  }
};

/**
 * 時間範囲に基づいてミリ秒を計算
 */
export const getTimeRangeMs = (range: TimeRange): number => {
  switch (range) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
};

/**
 * 時間範囲のラベルを取得
 */
export const getTimeRangeLabel = (range: TimeRange): string => {
  switch (range) {
    case "24h":
      return "24時間";
    case "7d":
      return "7日間";
    case "30d":
      return "30日間";
  }
};

/**
 * 成功率を計算
 */
export const calculateSuccessRate = (
  requestStats: RequestStats | undefined,
): number => {
  if (!requestStats || requestStats.totalRequests === 0) {
    return 0;
  }
  return Math.round(
    (requestStats.successRequests / requestStats.totalRequests) * 100,
  );
};

/**
 * エラー率のパーセンテージを計算
 */
export const calculateErrorPercentage = (
  requestStats: RequestStats | undefined,
): number => {
  if (!requestStats || requestStats.totalRequests === 0) {
    return 0;
  }
  return Math.round(
    ((requestStats.errorRequests ?? 0) / requestStats.totalRequests) * 100,
  );
};

/**
 * サーバーから取得した統計データをグラフ用データに変換
 * 日別データと時間別データ両方に対応
 */
export const convertDailyStatsToChartData = (
  dailyStats: DailyStatsData[] | undefined,
): { dailyData: DailyData[]; hourlyData: HourlyData[]; maxCount: number } => {
  if (!dailyStats || dailyStats.length === 0) {
    return { dailyData: [], hourlyData: [], maxCount: 0 };
  }

  // 時間別データの場合（hourフィールドが存在する）
  const hasHourlyData = dailyStats.some((stat) => stat.hour !== undefined);

  if (hasHourlyData) {
    const hourlyData: HourlyData[] = dailyStats.map((stat) => ({
      hour: stat.hour ?? 0,
      count: stat.totalCount,
    }));
    const maxCount = Math.max(...hourlyData.map((d) => d.count));
    return { dailyData: [], hourlyData, maxCount };
  }

  // 日別データの場合
  const dailyData: DailyData[] = dailyStats.map((stat) => {
    const date = new Date(stat.date);
    return {
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      count: stat.totalCount,
    };
  });

  const maxCount = Math.max(...dailyData.map((d) => d.count));

  return { dailyData, hourlyData: [], maxCount };
};

/**
 * ブラウザのタイムゾーンを取得
 * 例: "Asia/Tokyo"
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Date オブジェクトを ISO 8601 形式（タイムゾーン情報付き）の文字列に変換
 * 例: "2024-12-01T00:00:00.000+09:00"
 */
const formatDateWithTimezone = (date: Date): string => {
  const timezone = getUserTimezone();
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
};

export type Granularity = "day" | "hour";

/**
 * 時間範囲から日数、タイムゾーン、粒度を取得
 */
export const getDaysAndTimezoneFromTimeRange = (
  range: TimeRange,
): { days: number; timezone: string; granularity: Granularity } => {
  const timezone = getUserTimezone();
  const days = timeRangeToDays(range);
  // 24時間表示の場合は時間別、それ以外は日別
  const granularity: Granularity = range === "24h" ? "hour" : "day";

  return {
    days,
    timezone,
    granularity,
  };
};

/**
 * 時間範囲から開始日時と終了日時を計算（findRequestLogs用）
 */
export const getDateRangeFromTimeRange = (
  range: TimeRange,
): { startDate: string; endDate: string } => {
  const now = new Date();
  const endDate = formatDateWithTimezone(now);

  let startDate: Date;
  switch (range) {
    case "24h":
      startDate = subHours(now, 24);
      break;
    case "7d":
      startDate = subDays(now, 7);
      break;
    case "30d":
      startDate = subDays(now, 30);
      break;
  }

  return {
    startDate: formatDateWithTimezone(startDate),
    endDate,
  };
};

/**
 * ページネーション用のページ番号リストを生成
 * 大量のページがある場合でも効率的に表示するため、
 * 最初、最後、現在のページ周辺のみを表示
 */
export const getPaginationPages = (
  currentPage: number,
  totalPages: number,
): number[] => {
  // ページ数が少ない場合は全て表示
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // 常に表示するページ番号を Set で管理（重複を防ぐ）
  const pages = new Set<number>([1, totalPages]);

  // 現在のページの前後1ページも表示
  const rangeStart = Math.max(1, currentPage - 1);
  const rangeEnd = Math.min(totalPages, currentPage + 1);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.add(i);
  }

  // Set を配列に変換してソート
  return Array.from(pages).sort((a, b) => a - b);
};
