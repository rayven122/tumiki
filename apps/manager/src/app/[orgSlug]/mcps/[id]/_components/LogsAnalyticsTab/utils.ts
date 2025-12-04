import type { RequestStats, RequestLog } from "../types";

export type TimeRange = "24h" | "7d" | "30d";

type HourlyData = {
  hour: number;
  count: number;
};

type DailyData = {
  day: string;
  count: number;
};

export type DailyStatsData = {
  date: string; // YYYY-MM-DD
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
 * 過去24時間の時間別リクエストデータを集計
 */
export const getHourlyRequestData = (
  requestLogs: RequestLog[] | undefined,
): { hourlyData: HourlyData[]; maxCount: number } => {
  // 24時間分の配列を初期化
  const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));

  if (!requestLogs || requestLogs.length === 0) {
    return { hourlyData, maxCount: 0 };
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 過去24時間以内のログのみをカウント
  for (const log of requestLogs) {
    const logDate = new Date(log.createdAt);
    if (logDate >= twentyFourHoursAgo && logDate <= now) {
      const hour = logDate.getHours();
      if (hour >= 0 && hour < 24 && hourlyData[hour]) {
        hourlyData[hour].count++;
      }
    }
  }

  const maxCount = Math.max(...hourlyData.map((d) => d.count));

  return { hourlyData, maxCount };
};

/**
 * 指定期間の日別リクエストデータを集計
 */
export const getDailyRequestData = (
  requestLogs: RequestLog[] | undefined,
  range: TimeRange,
): { dailyData: DailyData[]; maxCount: number } => {
  const days = range === "7d" ? 7 : 30;

  // 指定日数分の配列を初期化
  const dailyData: DailyData[] = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      count: 0,
    };
  });

  if (!requestLogs || requestLogs.length === 0) {
    return { dailyData, maxCount: 0 };
  }

  const now = new Date();
  const rangeStart = new Date(now.getTime() - getTimeRangeMs(range));

  // 指定期間内のログを日別にカウント
  for (const log of requestLogs) {
    const logDate = new Date(log.createdAt);
    if (logDate >= rangeStart && logDate <= now) {
      const daysDiff = Math.floor(
        (now.getTime() -
          new Date(
            logDate.getFullYear(),
            logDate.getMonth(),
            logDate.getDate(),
          ).getTime()) /
          (24 * 60 * 60 * 1000),
      );
      const index = days - 1 - daysDiff;
      if (index >= 0 && index < days && dailyData[index]) {
        dailyData[index].count++;
      }
    }
  }

  const maxCount = Math.max(...dailyData.map((d) => d.count));

  return { dailyData, maxCount };
};

/**
 * サーバーから取得した日別統計データを24時間の時間別データに変換
 */
export const convertDailyStatsToHourlyData = (
  dailyStats: DailyStatsData[] | undefined,
): { hourlyData: HourlyData[]; maxCount: number } => {
  // 24時間分の配列を初期化
  const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));

  if (!dailyStats || dailyStats.length === 0) {
    return { hourlyData, maxCount: 0 };
  }

  // 今日のデータを取得（最後の要素）
  const today = dailyStats[dailyStats.length - 1];
  if (today) {
    // 24時間の場合は、1日のトータルを現在時刻に振り分ける
    // より詳細な時間別データが必要な場合は、サーバー側で時間別集計を実装する必要がある
    const currentHour = new Date().getHours();
    const currentHourData = hourlyData[currentHour];
    if (currentHourData) {
      currentHourData.count = today.totalCount;
    }
  }

  const maxCount = Math.max(...hourlyData.map((d) => d.count));

  return { hourlyData, maxCount };
};

/**
 * サーバーから取得した日別統計データをグラフ用のDailyDataに変換
 */
export const convertDailyStatsToChartData = (
  dailyStats: DailyStatsData[] | undefined,
): { dailyData: DailyData[]; maxCount: number } => {
  if (!dailyStats || dailyStats.length === 0) {
    return { dailyData: [], maxCount: 0 };
  }

  const dailyData: DailyData[] = dailyStats.map((stat) => {
    const date = new Date(stat.date);
    return {
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      count: stat.totalCount,
    };
  });

  const maxCount = Math.max(...dailyData.map((d) => d.count));

  return { dailyData, maxCount };
};

/**
 * Date オブジェクトを ISO 8601 形式（タイムゾーン情報付き）の文字列に変換
 * 例: "2024-12-01T00:00:00.000+09:00"
 */
export const formatDateWithTimezone = (date: Date): string => {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hour}:${min}:${sec}.${ms}${sign}${hours}:${minutes}`;
};

/**
 * 時間範囲から開始日時と終了日時を計算
 */
export const getDateRangeFromTimeRange = (
  range: TimeRange,
): { startDate: string; endDate: string } => {
  const now = new Date();
  const endDate = formatDateWithTimezone(now);

  let startDate: Date;
  switch (range) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    startDate: formatDateWithTimezone(startDate),
    endDate,
  };
};
