import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { addDays, addHours, subDays, subHours } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { McpServerId } from "@/schema/ids";

// UTC時刻で日の開始(00:00:00.000)を返す
const startOfDayUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// UTC時刻で日の終了(23:59:59.999)を返す
const endOfDayUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

type Granularity = "day" | "hour";

type GetRequestLogsStatsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
  days: number; // 過去N日間（1〜90）
  timezone: string; // IANAタイムゾーン名（例: "Asia/Tokyo"）
  granularity: Granularity; // 集計粒度（日別 or 時間別）
};

// リクエスト統計のレスポンススキーマ（日別・時間別両対応）
export const getRequestLogsStatsOutputSchema = z.array(
  z.object({
    date: z.string(), // YYYY-MM-DD形式（日別）or YYYY-MM-DD HH:00形式（時間別）
    hour: z.number().optional(), // 時間（0-23）、時間別集計時のみ
    successCount: z.number(),
    errorCount: z.number(),
    totalCount: z.number(),
  }),
);

export type GetRequestLogsStatsOutput = z.infer<
  typeof getRequestLogsStatsOutputSchema
>;

export const getRequestLogsStats = async (
  tx: PrismaTransactionClient,
  input: GetRequestLogsStatsInput,
): Promise<GetRequestLogsStatsOutput> => {
  const { userMcpServerId, organizationId, days, timezone, granularity } =
    input;

  // サーバーの存在確認
  const server = await tx.mcpServer.findUnique({
    where: {
      id: userMcpServerId,
      organizationId,
      deletedAt: null,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // 時間別集計の場合
  if (granularity === "hour") {
    return getHourlyStats(tx, userMcpServerId, organizationId, timezone);
  }

  // 日別集計の場合（既存ロジック）
  return getDailyStats(tx, userMcpServerId, organizationId, days, timezone);
};

// 時間別集計（過去24時間）
const getHourlyStats = async (
  tx: PrismaTransactionClient,
  userMcpServerId: McpServerId,
  organizationId: string,
  timezone: string,
): Promise<GetRequestLogsStatsOutput> => {
  const now = new Date();
  const startDate = subHours(now, 24);

  // 過去24時間のリクエストログを取得
  const logs = await tx.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
      createdAt: {
        gte: startDate,
        lte: now,
      },
    },
    select: {
      httpStatus: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // 時間ごとに集計（キーは "YYYY-MM-DD HH" 形式）
  const statsMap = new Map<
    string,
    {
      hour: number;
      successCount: number;
      errorCount: number;
      totalCount: number;
    }
  >();

  // 過去24時間の全時間を初期化（現在の時間枠も含めるため25回ループ）
  // 例: 現在13:36の場合、13時(昨日)～13時(今日)の25時間枠を生成
  // ログクエリは startDate(24時間前) ～ now なので、現在の時間枠も含む必要がある
  let currentHour = startDate;
  for (let i = 0; i < 25; i++) {
    const dateTimeStr = formatInTimeZone(
      currentHour,
      timezone,
      "yyyy-MM-dd HH",
    );
    const hour = parseInt(formatInTimeZone(currentHour, timezone, "HH"), 10);
    statsMap.set(dateTimeStr, {
      hour,
      successCount: 0,
      errorCount: 0,
      totalCount: 0,
    });
    currentHour = addHours(currentHour, 1);
  }

  // ログデータを集計
  for (const log of logs) {
    const dateTimeStr = formatInTimeZone(
      log.createdAt,
      timezone,
      "yyyy-MM-dd HH",
    );

    const stats = statsMap.get(dateTimeStr);
    if (!stats) continue;

    stats.totalCount++;
    if (log.httpStatus >= 200 && log.httpStatus < 300) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
  }

  // Map を配列に変換して時間順にソート
  const result = Array.from(statsMap.entries())
    .map(([dateTime, stats]) => ({
      date: dateTime,
      hour: stats.hour,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      totalCount: stats.totalCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
};

// 日別集計（既存ロジック）
const getDailyStats = async (
  tx: PrismaTransactionClient,
  userMcpServerId: McpServerId,
  organizationId: string,
  days: number,
  timezone: string,
): Promise<GetRequestLogsStatsOutput> => {
  // 現在時刻から過去N日間の日付範囲を計算
  // 今日を含めて過去N日間なので、今日から(N-1)日前の00:00:00 UTCが開始日
  const now = new Date();
  const startDate = startOfDayUTC(subDays(now, days - 1));
  const endDate = endOfDayUTC(now);

  // 指定期間のリクエストログを取得
  const logs = await tx.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      httpStatus: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // 日付ごとに集計
  const statsMap = new Map<
    string,
    { successCount: number; errorCount: number; totalCount: number }
  >();

  // 期間内の全日付を初期化
  let currentDate = startDate;

  for (let i = 0; i < days; i++) {
    const dateStr = formatInTimeZone(currentDate, timezone, "yyyy-MM-dd");
    statsMap.set(dateStr, { successCount: 0, errorCount: 0, totalCount: 0 });
    currentDate = addDays(currentDate, 1);
  }

  // ログデータを集計（クライアントのタイムゾーンに変換して日付を判定）
  for (const log of logs) {
    const dateStr = formatInTimeZone(log.createdAt, timezone, "yyyy-MM-dd");

    const stats = statsMap.get(dateStr);
    if (!stats) continue;

    stats.totalCount++;
    if (log.httpStatus >= 200 && log.httpStatus < 300) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
  }

  // Map を配列に変換して日付順にソート
  const result = Array.from(statsMap.entries())
    .map(([date, stats]) => ({
      date,
      ...stats,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
};
