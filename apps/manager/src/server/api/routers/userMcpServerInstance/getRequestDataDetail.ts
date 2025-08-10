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
  inputDataCompressed: z.string(), // Base64エンコードされた圧縮データ
  outputDataCompressed: z.string(), // Base64エンコードされた圧縮データ
  originalInputSize: z.number(),
  originalOutputSize: z.number(),
  compressedInputSize: z.number(),
  compressedOutputSize: z.number(),
  compressionRatio: z.number(),
  createdAt: z.date(),
  // リクエストログの基本情報も含める
  requestLog: z.object({
    id: z.string(),
    toolName: z.string(),
    method: z.string(),
    responseStatus: z.string(),
    durationMs: z.number(),
    createdAt: z.date(),
  }),
});

export const getRequestDataDetail = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof GetRequestDataDetailInput>;
  ctx: ProtectedContext;
}) => {
  if (!ctx.currentOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "組織が選択されていません",
    });
  }

  // まずリクエストログの存在確認とアクセス権チェック
  const requestLog = await db.mcpServerRequestLog.findUnique({
    where: {
      id: input.requestLogId,
      organizationId: ctx.currentOrganizationId,
    },
    include: {
      mcpServerInstance: {
        select: {
          id: true,
          organizationId: true,
        },
      },
      requestData: true,
    },
  });

  if (!requestLog) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "リクエストログが見つかりません",
    });
  }

  // 組織のアクセス権限チェック
  if (
    requestLog.mcpServerInstance.organizationId !== ctx.currentOrganizationId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "アクセス権限がありません",
    });
  }

  // 詳細データが存在しない場合
  if (!requestLog.requestData) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "詳細データが見つかりません。データが保存されていない可能性があります。",
    });
  }

  // Bufferデータを Base64 エンコードして返却
  const inputDataBase64 = Buffer.from(
    requestLog.requestData.inputDataCompressed,
  ).toString("base64");
  const outputDataBase64 = Buffer.from(
    requestLog.requestData.outputDataCompressed,
  ).toString("base64");

  return {
    id: requestLog.requestData.id,
    requestLogId: requestLog.requestData.requestLogId,
    inputDataCompressed: inputDataBase64,
    outputDataCompressed: outputDataBase64,
    originalInputSize: requestLog.requestData.originalInputSize,
    originalOutputSize: requestLog.requestData.originalOutputSize,
    compressedInputSize: requestLog.requestData.compressedInputSize,
    compressedOutputSize: requestLog.requestData.compressedOutputSize,
    compressionRatio: requestLog.requestData.compressionRatio,
    createdAt: requestLog.requestData.createdAt,
    requestLog: {
      id: requestLog.id,
      toolName: requestLog.toolName,
      method: requestLog.method,
      responseStatus: requestLog.responseStatus,
      durationMs: requestLog.durationMs,
      createdAt: requestLog.createdAt,
    },
  };
};
