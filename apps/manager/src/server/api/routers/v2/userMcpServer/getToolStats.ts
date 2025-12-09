import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";

type GetToolStatsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
};

// ツール統計のレスポンススキーマ
export const getToolStatsOutputSchema = z.array(
  z.object({
    toolName: z.string(),
    requestCount: z.number(),
    successCount: z.number(),
    errorCount: z.number(),
    averageDurationMs: z.number(),
  }),
);

export type GetToolStatsOutput = z.infer<typeof getToolStatsOutputSchema>;

export const getToolStats = async (
  tx: PrismaTransactionClient,
  input: GetToolStatsInput,
): Promise<GetToolStatsOutput> => {
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

  // リクエストログを取得
  const logs = await tx.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
    },
    select: {
      toolName: true,
      httpStatus: true,
      durationMs: true,
    },
  });

  // ツール名ごとに統計を集計
  const statsMap = new Map<
    string,
    {
      requestCount: number;
      successCount: number;
      errorCount: number;
      totalDurationMs: number;
    }
  >();

  for (const log of logs) {
    const stats = statsMap.get(log.toolName) ?? {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
    };

    stats.requestCount += 1;
    stats.totalDurationMs += log.durationMs;

    if (log.httpStatus >= 200 && log.httpStatus < 300) {
      stats.successCount += 1;
    } else {
      stats.errorCount += 1;
    }

    statsMap.set(log.toolName, stats);
  }

  // Mapを配列に変換して返す
  return Array.from(statsMap.entries()).map(([toolName, stats]) => ({
    toolName,
    requestCount: stats.requestCount,
    successCount: stats.successCount,
    errorCount: stats.errorCount,
    averageDurationMs: Math.round(stats.totalDurationMs / stats.requestCount),
  }));
};
