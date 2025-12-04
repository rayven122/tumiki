import type { PrismaTransactionClient } from "@tumiki/db";
import { TransportType } from "@tumiki/db";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";

type FindRequestLogsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
  page: number;
  pageSize: number;
  days: number; // 期間（日数）- 1〜30日、必須
};

// リクエストログのレスポンススキーマ
export const findRequestLogsOutputSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      toolName: z.string(),
      transportType: z.enum(["SSE", "STREAMABLE_HTTPS"]),
      method: z.string(),
      httpStatus: z.number(),
      durationMs: z.number(),
      inputBytes: z.number(),
      outputBytes: z.number(),
      userAgent: z.string().nullable(),
      createdAt: z.date(),
    }),
  ),
  pageInfo: z.object({
    currentPage: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  }),
});

export type FindRequestLogsOutput = z.infer<typeof findRequestLogsOutputSchema>;

export const findRequestLogs = async (
  tx: PrismaTransactionClient,
  input: FindRequestLogsInput,
): Promise<FindRequestLogsOutput> => {
  const { userMcpServerId, organizationId, page, pageSize, days } = input;

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

  // 期間フィルタの計算（daysは必須）
  const createdAtFilter = {
    gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  };

  // TransportTypeをDB層でフィルタリング（SSEとSTREAMABLE_HTTPSのみ）
  const whereClause = {
    mcpServerId: userMcpServerId,
    organizationId,
    createdAt: createdAtFilter,
    transportType: {
      in: [TransportType.SSE, TransportType.STREAMABLE_HTTPS],
    },
  };

  // 総件数を取得（フィルタ後）
  const totalCount = await tx.mcpServerRequestLog.count({
    where: whereClause,
  });

  // ページネーション計算
  const skip = (page - 1) * pageSize;
  const totalPages = Math.ceil(totalCount / pageSize);

  // リクエストログを取得（最新順）
  const logs = await tx.mcpServerRequestLog.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageSize,
    select: {
      id: true,
      toolName: true,
      transportType: true,
      method: true,
      httpStatus: true,
      durationMs: true,
      inputBytes: true,
      outputBytes: true,
      userAgent: true,
      createdAt: true,
    },
  });

  // DB層でフィルタリング済みなので、型アサーションで安全に変換
  const typedLogs = logs as FindRequestLogsOutput["data"];

  return {
    data: typedLogs,
    pageInfo: {
      currentPage: page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
};
