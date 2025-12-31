import type { PrismaTransactionClient } from "@tumiki/db";
import { TransportType } from "@tumiki/db";
import { z } from "zod";
import { parseISO } from "date-fns";
import type { McpServerId } from "@/schema/ids";

type FindRequestLogsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
  page: number;
  pageSize: number;
  startDate: string; // ISO 8601形式（タイムゾーン情報付き）必須
  endDate?: string; // ISO 8601形式（タイムゾーン情報付き）オプショナル
  method?: string; // メソッドでフィルター（例: "tools/call", "tools/list"）
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
      // TOON変換関連
      toonConversionEnabled: z.boolean().nullable(),
      inputTokens: z.number().nullable(),
      outputTokens: z.number().nullable(),
      // PIIマスキング関連
      piiMaskingMode: z.enum(["DISABLED", "REQUEST", "RESPONSE", "BOTH"]),
      piiDetectedRequestCount: z.number().nullable(),
      piiDetectedResponseCount: z.number().nullable(),
      piiDetectedInfoTypes: z.array(z.string()),
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
  const {
    userMcpServerId,
    organizationId,
    page,
    pageSize,
    startDate,
    endDate,
    method,
  } = input;

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
  const end = endDate ? parseISO(endDate) : new Date();

  // 期間フィルタの計算
  const createdAtFilter = {
    gte: start,
    lte: end,
  };

  // TransportTypeをDB層でフィルタリング（SSEとSTREAMABLE_HTTPSのみ）
  const whereClause = {
    mcpServerId: userMcpServerId,
    organizationId,
    createdAt: createdAtFilter,
    transportType: {
      in: [TransportType.SSE, TransportType.STREAMABLE_HTTPS],
    },
    // メソッドフィルター（指定がある場合のみ）
    ...(method && { method }),
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
      // TOON変換関連
      toonConversionEnabled: true,
      inputTokens: true,
      outputTokens: true,
      // PIIマスキング関連
      piiMaskingMode: true,
      piiDetectedRequestCount: true,
      piiDetectedResponseCount: true,
      piiDetectedInfoTypes: true,
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
