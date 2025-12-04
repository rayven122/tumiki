import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import type { McpServerId } from "@/schema/ids";

type FindRequestLogsInput = {
  userMcpServerId: McpServerId;
  organizationId: string;
  limit?: number;
};

// リクエストログのレスポンススキーマ
export const findRequestLogsOutputSchema = z.array(
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
);

export type FindRequestLogsOutput = z.infer<typeof findRequestLogsOutputSchema>;

/**
 * TransportTypeが SSE または STREAMABLE_HTTPS かどうかを判定する型ガード
 * 戻り値の型はFindRequestLogsOutputの要素型と一致させる
 */
const isValidTransportType = (log: {
  id: string;
  toolName: string;
  transportType: string;
  method: string;
  httpStatus: number;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  userAgent: string | null;
  createdAt: Date;
}): log is FindRequestLogsOutput[number] => {
  return (
    log.transportType === "SSE" || log.transportType === "STREAMABLE_HTTPS"
  );
};

export const findRequestLogs = async (
  tx: PrismaTransactionClient,
  input: FindRequestLogsInput,
): Promise<FindRequestLogsOutput> => {
  const { userMcpServerId, organizationId, limit = 100 } = input;

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

  // リクエストログを取得（最新順）
  const logs = await tx.mcpServerRequestLog.findMany({
    where: {
      mcpServerId: userMcpServerId,
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
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

  // TransportTypeをフィルタリング（SSEとSTREAMABLE_HTTPSのみ返す）
  // 型ガードを使用して型を絞り込む
  return logs.filter(isValidTransportType);
};
