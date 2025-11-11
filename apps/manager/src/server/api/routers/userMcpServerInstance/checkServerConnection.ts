import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { CheckServerConnectionInput } from ".";
import { ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import { getMcpServerToolsHTTP } from "@/utils/getMcpServerTools";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createCloudRunHeaders } from "@/utils/cloudRunAuth";

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
        toolGroup: {
          include: {
            toolGroupTools: {
              include: {
                userMcpServerConfig: {
                  // envVarsフィールドはデフォルトでomitされているため、明示的にselectで取得
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    envVars: true, // 明示的に含める
                    mcpServerId: true,
                    mcpServer: {
                      select: {
                        id: true,
                        name: true,
                        url: true,
                        authType: true,
                      },
                    },
                  },
                },
              },
              take: 1, // 最初の設定のみ取得
            },
          },
        },
      },
    });

    if (!serverInstance) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "リソースが見つかりません",
      });
    }

    // ToolGroupとUserMcpServerConfigが存在することを確認
    const toolGroupTool = serverInstance.toolGroup?.toolGroupTools[0];
    if (!toolGroupTool?.userMcpServerConfig) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "サーバー設定が見つかりません",
      });
    }

    const userMcpServerConfig = toolGroupTool.userMcpServerConfig;
    const mcpServer = userMcpServerConfig.mcpServer;

    if (!mcpServer) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "MCPサーバー情報が見つかりません",
      });
    }

    let success = false;
    let tools: Tool[] = [];
    let errorMessage: string | undefined;

    try {
      // ヘッダーを構築
      const headers: Record<string, string> = {};

      // Cloud Run IAM認証が必要な場合
      if (mcpServer.authType === "CLOUD_RUN_IAM") {
        try {
          const cloudRunHeaders = await createCloudRunHeaders(
            mcpServer.url ?? "",
          );
          Object.assign(headers, cloudRunHeaders);
        } catch (error) {
          // ローカル環境などでADCが設定されていない場合は警告を出すが、
          // カスタムヘッダー（APIキーなど）での接続を試みる
          console.warn(
            "Cloud Run IAM authentication failed, continuing with custom headers only:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // envVarsからカスタムヘッダーを追加
      if (userMcpServerConfig.envVars) {
        try {
          const envVars = JSON.parse(userMcpServerConfig.envVars) as Record<
            string,
            string
          >;
          Object.assign(headers, envVars);
        } catch (error) {
          console.error("Failed to parse envVars:", error);
        }
      }

      // 直接MCPサーバーのURLに接続してツール一覧を取得
      tools = await getMcpServerToolsHTTP(
        {
          name: mcpServer.name,
          url: mcpServer.url ?? "",
        },
        headers,
      );

      // ツールが0個の場合もエラーとして扱う
      if (tools.length === 0) {
        errorMessage = "サーバーの接続確認に失敗しました";
        success = false;
      } else {
        success = true;
      }
    } catch (error) {
      // 本番環境では詳細なエラーメッセージを避ける
      console.error("Server connection check failed:", error);
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
