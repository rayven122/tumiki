import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";

type GetRequestLogsStatsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
  startDate: string; // ISO 8601形式（タイムゾーン情報付き）例: "2024-12-01T00:00:00.000+09:00"
  endDate: string; // ISO 8601形式（タイムゾーン情報付き）例: "2024-12-05T23:59:59.999+09:00"
};

/**
 * ISO 8601文字列からタイムゾーンオフセット（分）を抽出
 * 例: "2024-12-01T00:00:00.000+09:00" → -540
 */
const extractTimezoneOffset = (isoString: string): number => {
  const match = /([+-])(\d{2}):(\d{2})$/.exec(isoString);
  if (!match) return 0; // タイムゾーン情報がない場合はUTC

  const sign = match[1] === "+" ? -1 : 1; // ISO形式とJavaScriptの符号は逆
  const hours = parseInt(match[2] ?? "0", 10);
  const minutes = parseInt(match[3] ?? "0", 10);

  return sign * (hours * 60 + minutes);
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

  // ISO文字列からタイムゾーンオフセットを抽出
  const timezoneOffset = extractTimezoneOffset(startDate);

  // ISO文字列をDateオブジェクトに変換（自動的にUTCに変換される）
  const start = new Date(startDate);
  const end = new Date(endDate);

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
  const clientStartDate = new Date(
    start.getTime() - timezoneOffset * 60 * 1000,
  );
  const clientEndDate = new Date(end.getTime() - timezoneOffset * 60 * 1000);

  for (
    let d = new Date(clientStartDate);
    d <= clientEndDate;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    statsMap.set(dateStr, { successCount: 0, errorCount: 0, totalCount: 0 });
  }

  // ログデータを集計（クライアントのタイムゾーンに変換して日付を判定）
  for (const log of logs) {
    // UTC時刻をクライアントのタイムゾーンに変換
    const clientDate = new Date(
      log.createdAt.getTime() - timezoneOffset * 60 * 1000,
    );
    const year = clientDate.getUTCFullYear();
    const month = String(clientDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(clientDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

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
