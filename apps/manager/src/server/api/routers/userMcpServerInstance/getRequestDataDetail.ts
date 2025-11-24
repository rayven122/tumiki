import { type ProtectedContext } from "@/server/api/trpc";
import { db } from "@tumiki/db/tcp";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const GetRequestDataDetailInput = z.object({
  requestLogId: z.string(),
});

export const GetRequestDataDetailOutput = z.object({
  id: z.string(),
  requestLogId: z.string(),
  // リクエストログの基本情報
  requestLog: z.object({
    id: z.string(),
    toolName: z.string(),
    method: z.string(),
    httpStatus: z.string(),
    durationMs: z.number(),
    inputBytes: z.number(),
    outputBytes: z.number(),
    gcsObjectKey: z.string().nullable(),
    createdAt: z.date(),
  }),
});

/**
 * 新スキーマ：リクエスト詳細データ取得
 * - mcpServerInstance → mcpServer（プロパティ名）
 * - requestData リレーションは削除され、GCSに保存される想定
 */
export const getRequestDataDetail = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof GetRequestDataDetailInput>;
  ctx: ProtectedContext;
}) => {
  // まずリクエストログの存在確認とアクセス権チェック
  const requestLog = await db.mcpServerRequestLog.findUnique({
    where: {
      id: input.requestLogId,
      organizationId: ctx.currentOrganizationId,
    },
    include: {
      mcpServer: {
        select: {
          id: true,
          organizationId: true,
        },
      },
    },
  });

  if (!requestLog) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "リクエストログが見つかりません",
    });
  }

  // 組織のアクセス権限チェック
  if (requestLog.mcpServer.organizationId !== ctx.currentOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "アクセス権限がありません",
    });
  }

  // GCSオブジェクトキーが存在しない場合
  if (!requestLog.gcsObjectKey) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "詳細データが見つかりません。データがGCSに保存されていない可能性があります。",
    });
  }

  // TODO: GCSからデータを取得する実装
  // 現時点ではリクエストログの基本情報のみを返す
  return {
    id: requestLog.id,
    requestLogId: requestLog.id,
    requestLog: {
      id: requestLog.id,
      toolName: requestLog.toolName,
      method: requestLog.method,
      httpStatus: requestLog.httpStatus,
      durationMs: requestLog.durationMs,
      inputBytes: requestLog.inputBytes,
      outputBytes: requestLog.outputBytes,
      gcsObjectKey: requestLog.gcsObjectKey,
      createdAt: requestLog.createdAt,
    },
  };
};
