import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { TimeSeriesStatsOutput, type GetTimeSeriesStatsInput } from "./index";
import type { z } from "zod";

export const getTimeSeriesStats = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof GetTimeSeriesStatsInput>;
  ctx: ProtectedContext;
}) => {
  if (!ctx.currentOrganizationId) {
    throw new Error("組織が選択されていません");
  }

  // 組織がそのインスタンスにアクセス権を持っているかチェック
  const instance = await db.userMcpServerInstance.findFirst({
    where: {
      id: input.instanceId,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
  });

  if (!instance) {
    throw new Error("アクセス権限がありません");
  }

  // 期間と間隔の設定
  const now = new Date();
  let startDate: Date;
  let timeFormat: string;

  const period = input.period ?? "24hours";
  switch (period) {
    case "24hours":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      timeFormat = "HH24:00";
      break;
    case "7days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeFormat = "YYYY-MM-DD";
      break;
    case "30days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeFormat = "YYYY-MM-DD";
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      timeFormat = "HH24:00";
  }

  // 時系列統計をRawクエリで取得
  const timeSeriesStats = await db.$queryRaw<
    Array<{
      time_bucket: string;
      request_count: bigint;
      error_count: bigint;
      avg_duration: number | null;
    }>
  >`
    SELECT 
      TO_CHAR(DATE_TRUNC('hour', "createdAt"), ${timeFormat}) as time_bucket,
      COUNT(*) as request_count,
      COUNT(CASE WHEN "responseStatus" != '200' THEN 1 END) as error_count,
      AVG("durationMs") as avg_duration
    FROM "McpServerRequestLog"
    WHERE "mcpServerInstanceId" = ${input.instanceId}
      AND "createdAt" >= ${startDate}
    GROUP BY time_bucket
    ORDER BY time_bucket
  `;

  const result = timeSeriesStats.map((stat) => ({
    time: stat.time_bucket,
    requests: Number(stat.request_count),
    errors: Number(stat.error_count),
    avgDuration: Math.round(stat.avg_duration ?? 0),
  }));

  // Zodでパースして型安全性を確保
  return TimeSeriesStatsOutput.parse(result);
};
