import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import { subDays, subHours } from "date-fns";
import type { McpServerId } from "@/schema/ids";

type GetRequestStatsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
};

// リクエスト統計のレスポンススキーマ
export const getRequestStatsOutputSchema = z.object({
  totalRequests: z.number(),
  successRequests: z.number(),
  errorRequests: z.number(),
  totalInputBytes: z.number(),
  totalOutputBytes: z.number(),
  averageDurationMs: z.number(),
  last24hRequests: z.number(),
  last7dRequests: z.number(),
});

export type GetRequestStatsOutput = z.infer<typeof getRequestStatsOutputSchema>;

export const getRequestStats = async (
  tx: PrismaTransactionClient,
  input: GetRequestStatsInput,
): Promise<GetRequestStatsOutput> => {
  const { userMcpServerId, organizationId } = input;

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

  const now = new Date();
  const last24h = subHours(now, 24);
  const last7d = subDays(now, 7);

  // データベース側で集計（単一クエリ）
  const stats = await tx.mcpServerRequestLog.aggregate({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
    },
    _count: { id: true },
    _sum: {
      inputBytes: true,
      outputBytes: true,
      durationMs: true,
    },
    _avg: {
      durationMs: true,
    },
  });

  // 成功/エラーカウント、24時間以内、7日以内のカウントを並列実行
  const [successCount, last24hCount, last7dCount] = await Promise.all([
    tx.mcpServerRequestLog.count({
      where: {
        mcpServerId: userMcpServerId,
        organizationId,
        httpStatus: { gte: 200, lt: 300 },
      },
    }),
    tx.mcpServerRequestLog.count({
      where: {
        mcpServerId: userMcpServerId,
        organizationId,
        createdAt: { gte: last24h },
      },
    }),
    tx.mcpServerRequestLog.count({
      where: {
        mcpServerId: userMcpServerId,
        organizationId,
        createdAt: { gte: last7d },
      },
    }),
  ]);

  const totalRequests = stats._count.id;

  return {
    totalRequests,
    successRequests: successCount,
    errorRequests: totalRequests - successCount,
    totalInputBytes: stats._sum.inputBytes ?? 0,
    totalOutputBytes: stats._sum.outputBytes ?? 0,
    averageDurationMs: Math.round(stats._avg.durationMs ?? 0),
    last24hRequests: last24hCount,
    last7dRequests: last7dCount,
  };
};
