import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
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

  // 全リクエストログを取得
  const allLogs = await tx.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
    },
    select: {
      httpStatus: true,
      inputBytes: true,
      outputBytes: true,
      durationMs: true,
      createdAt: true,
    },
  });

  // 統計計算
  const totalRequests = allLogs.length;
  const successRequests = allLogs.filter((log) =>
    log.httpStatus.startsWith("2"),
  ).length;
  const errorRequests = totalRequests - successRequests;
  const totalInputBytes = allLogs.reduce((sum, log) => sum + log.inputBytes, 0);
  const totalOutputBytes = allLogs.reduce(
    (sum, log) => sum + log.outputBytes,
    0,
  );
  const averageDurationMs =
    totalRequests > 0
      ? allLogs.reduce((sum, log) => sum + log.durationMs, 0) / totalRequests
      : 0;

  // 24時間以内のリクエスト数
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last24hRequests = allLogs.filter(
    (log) => log.createdAt >= last24h,
  ).length;

  // 7日以内のリクエスト数
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last7dRequests = allLogs.filter(
    (log) => log.createdAt >= last7d,
  ).length;

  return {
    totalRequests,
    successRequests,
    errorRequests,
    totalInputBytes,
    totalOutputBytes,
    averageDurationMs: Math.round(averageDurationMs),
    last24hRequests,
    last7dRequests,
  };
};
