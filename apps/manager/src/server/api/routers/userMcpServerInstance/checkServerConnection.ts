import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { CheckServerConnectionInput } from ".";
import { ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { getMcpServerToolsSSE } from "@tumiki/utils/server";
import { makeSseProxyServerUrl } from "@/utils/url";

type CheckServerConnectionInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof CheckServerConnectionInput>;
};

export const checkServerConnection = async ({
  ctx,
  input,
}: CheckServerConnectionInput) => {
  const { serverInstanceId, updateStatus = false } = input;

  // サーバーインスタンスが存在し、ユーザーが所有していることを確認
  const serverInstance = await ctx.db.userMcpServerInstance.findUnique({
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
      message: "サーバーインスタンスが見つかりません",
    });
  }

  // updateStatus=trueの場合、RUNNINGステータスならPENDINGに戻す
  if (updateStatus && serverInstance.serverStatus === ServerStatus.RUNNING) {
    await ctx.db.userMcpServerInstance.update({
      where: { id: serverInstanceId },
      data: {
        serverStatus: ServerStatus.PENDING,
      },
    });
  }

  // APIキーが存在しない場合はエラー
  if (!serverInstance.apiKeys || serverInstance.apiKeys.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "APIキーが見つかりません",
    });
  }

  const apiKey = serverInstance.apiKeys[0]!.apiKey;

  let success = false;
  let tools: unknown[] = [];
  let errorMessage: string | undefined;

  try {
    // getMcpServerToolsSSEを直接使用してツール一覧を取得
    tools = await getMcpServerToolsSSE(
      {
        name: "validation",
        url: makeSseProxyServerUrl(apiKey),
      },
      {
        "x-validation-mode": "true",
      },
    );
    success = true;
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
  }

  // 検証結果に基づいてステータスを更新（updateStatus=trueの場合のみ）
  const newStatus = success ? ServerStatus.RUNNING : ServerStatus.ERROR;

  if (updateStatus) {
    await ctx.db.userMcpServerInstance.update({
      where: { id: serverInstanceId },
      data: {
        serverStatus: newStatus,
      },
    });
  }

  return {
    success,
    status: updateStatus ? newStatus : serverInstance.serverStatus,
    error: errorMessage,
    toolCount: tools.length,
  };
};
