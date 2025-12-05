import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { McpServerId } from "@/schema/ids";

type GetRequestLogsStatsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
  startDate: string; // ISO 8601形式（タイムゾーン情報付き）例: "2024-12-01T00:00:00.000+09:00"
  endDate: string; // ISO 8601形式（タイムゾーン情報付き）例: "2024-12-05T23:59:59.999+09:00"
};

// 日付ごとのリクエスト統計のレスポンススキーマ
export const getRequestLogsStatsOutputSchema = z.array(
  z.object({
    date: z.string(), // YYYY-MM-DD形式
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
  const { userMcpServerId, organizationId, startDate, endDate } = input;

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

  // ISO文字列をDateオブジェクトに変換
  // parseISOは文字列に含まれるタイムゾーン情報を自動的に解釈する
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  // クライアントのタイムゾーンを抽出（例: "+09:00" から "+09:00" を取得）
  const timezoneMatch = /([+-]\d{2}:\d{2})$/.exec(startDate);
  const timezoneOffset = timezoneMatch ? timezoneMatch[1] : "+00:00";

  // 指定期間のリクエストログを取得
  const logs = await tx.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
      createdAt: {
        gte: start,
        lte: end,
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

  // 期間内の全日付を初期化（クライアントのタイムゾーンで）
  const startDateOnly = formatInTimeZone(
    start,
    timezoneOffset ?? "+00:00",
    "yyyy-MM-dd",
  );
  const endDateOnly = formatInTimeZone(
    end,
    timezoneOffset ?? "+00:00",
    "yyyy-MM-dd",
  );

  const current = parseISO(startDateOnly);
  const endDateObj = parseISO(endDateOnly);

  while (current <= endDateObj) {
    const dateStr = format(current, "yyyy-MM-dd");
    statsMap.set(dateStr, { successCount: 0, errorCount: 0, totalCount: 0 });
    current.setDate(current.getDate() + 1);
  }

  // ログデータを集計（クライアントのタイムゾーンに変換して日付を判定）
  for (const log of logs) {
    // UTC時刻をクライアントのタイムゾーンで日付に変換
    const dateStr = formatInTimeZone(
      log.createdAt,
      timezoneOffset ?? "+00:00",
      "yyyy-MM-dd",
    );

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
