import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { ToolStatsOutput, type GetToolStatsInput } from "./index";
import type { z } from "zod";

export const getToolStats = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof GetToolStatsInput>;
  ctx: ProtectedContext;
}) => {
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

  // 期間の計算
  const now = new Date();
  const periodDays = {
    "1day": 1,
    "7days": 7,
    "30days": 30,
    "90days": 90,
  };
  const period = input.period ?? "7days";
  const startDate = new Date(
    now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000,
  );

  // ツール別統計をRawクエリで取得
  const toolStats = await db.$queryRaw<
    Array<{
      toolName: string;
      count: bigint;
      avgDuration: number | null;
      errorCount: bigint;
    }>
  >`
    SELECT 
      "toolName",
      COUNT(*) as count,
      AVG("durationMs") as "avgDuration",
      COUNT(CASE WHEN "responseStatus" != '200' THEN 1 END) as "errorCount"
    FROM "McpServerRequestLog"
    WHERE "mcpServerInstanceId" = ${input.instanceId}
      AND "createdAt" >= ${startDate}
    GROUP BY "toolName"
    ORDER BY count DESC
  `;

  const result = toolStats.map((stat) => ({
    toolName: stat.toolName,
    count: Number(stat.count),
    avgDuration: Math.round(stat.avgDuration ?? 0),
    errorCount: Number(stat.errorCount),
    errorRate:
      stat.count > 0
        ? Math.round(
            (Number(stat.errorCount) / Number(stat.count)) * 100 * 10,
          ) / 10
        : 0,
  }));

  // Zodでパースして型安全性を確保
  return ToolStatsOutput.parse(result);
};
