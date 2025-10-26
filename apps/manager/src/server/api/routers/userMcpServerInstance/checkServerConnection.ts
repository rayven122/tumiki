import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { CheckServerConnectionInput } from ".";
import { ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { getMcpServerToolsHTTP } from "@/utils/getMcpServerTools";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { makeHttpProxyServerUrl } from "@/utils/url";

type CheckServerConnectionParams = {
  ctx: ProtectedContext;
  input: z.infer<typeof CheckServerConnectionInput>;
};

export const checkServerConnection = async ({
  ctx,
  input,
}: CheckServerConnectionParams) => {
  const { serverInstanceId, updateStatus = false } = input;

  const organizationId = ctx.currentOrganizationId;

  // トランザクションで処理を実行
  return await ctx.db.$transaction(async (tx) => {
    // サーバーインスタンスが存在し、組織が所有していることを確認
    const serverInstance = await tx.userMcpServerInstance.findUnique({
      where: {
        id: serverInstanceId,
        organizationId,
      },
      include: {
        apiKeys: {
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

    const apiKey = serverInstance.apiKeys[0]!.apiKey;

    let success = false;
    let tools: Tool[] = [];
    let errorMessage: string | undefined;

    try {
      // getMcpServerToolsHTTPを直接使用してツール一覧を取得
      tools = await getMcpServerToolsHTTP(
        {
          name: "validation",
          url: makeHttpProxyServerUrl(serverInstanceId),
        },
        {
          "x-validation-mode": "true",
          "x-api-key": apiKey,
        },
      );

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
