import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { type GetRequestStatsInput } from "./index";
import type { z } from "zod";

export const getRequestStats = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof GetRequestStatsInput>;
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

  // 今日の開始時刻
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 統計クエリ
  const [totalLogs, todayLogs, errorLogs] = await Promise.all([
    // 総ログ数とその他の統計
    db.mcpServerRequestLog.aggregate({
      where: {
        mcpServerInstanceId: input.instanceId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      _avg: {
        durationMs: true,
      },
      _sum: {
        inputBytes: true,
        outputBytes: true,
      },
    }),
    // 今日のリクエスト数
    db.mcpServerRequestLog.count({
      where: {
        mcpServerInstanceId: input.instanceId,
        createdAt: {
          gte: todayStart,
        },
      },
    }),
    // エラーログ
    db.mcpServerRequestLog.findMany({
      where: {
        mcpServerInstanceId: input.instanceId,
        createdAt: {
          gte: startDate,
        },
        responseStatus: {
          not: "200",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    }),
  ]);

  const totalRequests = totalLogs._count.id;
  const totalErrors = await db.mcpServerRequestLog.count({
    where: {
      mcpServerInstanceId: input.instanceId,
      createdAt: {
        gte: startDate,
      },
      responseStatus: {
        not: "200",
      },
    },
  });

  const successRate =
    totalRequests > 0
      ? ((totalRequests - totalErrors) / totalRequests) * 100
      : 0;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  return {
    totalRequests,
    todayRequests: todayLogs,
    totalErrors,
    successRate: Math.round(successRate * 10) / 10,
    errorRate: Math.round(errorRate * 10) / 10,
    avgDuration: Math.round(totalLogs._avg.durationMs ?? 0),
    totalInputBytes: totalLogs._sum.inputBytes ?? 0,
    totalOutputBytes: totalLogs._sum.outputBytes ?? 0,
    lastErrorTime: errorLogs[0]?.createdAt ?? null,
  };
};
