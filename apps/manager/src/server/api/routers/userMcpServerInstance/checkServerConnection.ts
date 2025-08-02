import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { CheckServerConnectionInput } from ".";
import { ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { getMcpServerToolsSSE } from "@tumiki/utils/server";
import { makeSseProxyServerUrl } from "@/utils/url";

type CheckServerConnectionParams = {
  ctx: ProtectedContext;
  input: z.infer<typeof CheckServerConnectionInput>;
};

export const checkServerConnection = async ({
  ctx,
  input,
}: CheckServerConnectionParams) => {
  const { serverInstanceId, updateStatus = false } = input;

  // トランザクションで処理を実行
  return await ctx.db.$transaction(async (tx) => {
    // サーバーインスタンスが存在し、ユーザーが所有していることを確認
    const serverInstance = await tx.userMcpServerInstance.findUnique({
      where: {
        id: serverInstanceId,
        userId: ctx.session.user.id,
      },
      include: {
        apiKeys: {
          where: {
            userId: ctx.session.user.id,
          },
          take: 1,
        },
      },
    });

    if (!serverInstance) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "リソースが見つかりません",
      });
    }

    // APIキーが存在しない場合はエラー
    if (!serverInstance.apiKeys || serverInstance.apiKeys.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "認証情報が見つかりません",
      });
    }

    const firstApiKey = serverInstance.apiKeys[0];
    if (!firstApiKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "認証情報が見つかりません",
      });
    }
    const apiKey = firstApiKey.apiKey;

    let success = false;
    let tools: unknown[] = [];
    let errorMessage: string | undefined;

    try {
      // getMcpServerToolsSSEを直接使用してツール一覧を取得
      const fetchedTools = await getMcpServerToolsSSE(
        {
          name: "validation",
          url: makeSseProxyServerUrl(apiKey),
        },
        {
          "x-validation-mode": "true",
        },
      );
      tools = fetchedTools;

      // ツールが0個の場合もエラーとして扱う
      if (tools.length === 0) {
        errorMessage = "サーバーの接続確認に失敗しました";
        success = false;
      } else {
        success = true;
      }
    } catch {
      // 本番環境では詳細なエラーメッセージを避ける
      errorMessage = "サーバーの接続確認に失敗しました";
      success = false;
    }

    // 検証結果に基づいてステータスを更新（updateStatus=trueの場合のみ）
    if (updateStatus) {
      const newStatus = success ? ServerStatus.RUNNING : ServerStatus.ERROR;
      await tx.userMcpServerInstance.update({
        where: { id: serverInstanceId },
        data: {
          serverStatus: newStatus,
        },
      });
    }

    return {
      success,
      status: updateStatus
        ? success
          ? ServerStatus.RUNNING
          : ServerStatus.ERROR
        : serverInstance.serverStatus,
      error: errorMessage,
      toolCount: tools.length,
    };
  });
};
