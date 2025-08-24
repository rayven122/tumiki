import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { CheckServerConnectionInput } from ".";
import { ServerStatus } from "@tumiki/db/prisma";
import { TRPCError } from "@trpc/server";
import {
  getMcpServerToolsSSE,
  runMcpSecurityScan,
  type McpScanResult,
} from "@tumiki/utils/server";
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
  const organizationId = ctx.currentOrganizationId;

  // トランザクションで処理を実行（セキュリティスキャンに時間がかかるため、タイムアウトを延長）
  return await ctx.db.$transaction(
    async (tx) => {
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
      let tools: unknown[] = [];
      let errorMessage: string | undefined;
      let securityScanResult: McpScanResult | undefined;

      try {
        // getMcpServerToolsSSEを直接使用してツール一覧を取得
        tools = await getMcpServerToolsSSE(
          {
            name: "validation",
            url: makeSseProxyServerUrl(serverInstanceId),
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
          // ツール取得に成功した場合、セキュリティスキャンを実行
          try {
            const serverUrl = makeSseProxyServerUrl(serverInstanceId);
            securityScanResult = await runMcpSecurityScan(
              serverUrl,
              apiKey,
              30000, // 30秒のタイムアウト
            );

            // エラーが発生した場合は接続を拒否
            if (!securityScanResult.success) {
              errorMessage = `セキュリティスキャンでエラーが発生しました: ${securityScanResult.error ?? "不明なエラー"}`;
              success = false;
            } else if (securityScanResult.issues.length > 0) {
              // 問題が検出された場合も接続を拒否
              errorMessage = `セキュリティリスクが検出されました (${securityScanResult.issues.length}件の問題)`;
              success = false;
            } else {
              success = true;
            }
          } catch (scanError) {
            // セキュリティスキャンのエラーはログに記録するが、接続自体は許可
            console.error("Security scan error:", scanError);
            // スキャンエラーの場合でも接続は成功とする
            success = true;
          }
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

      // セキュリティスキャン結果の整形
      const securityScan = securityScanResult
        ? {
            success: securityScanResult.success,
            issues: securityScanResult.issues.map((issue) => ({
              code: issue?.code ?? "unknown",
              message: issue?.message ?? "不明な問題",
              extraData: issue?.extra_data ?? undefined,
            })),
            error: securityScanResult.error,
          }
        : undefined;

      console.log("securityScan", securityScan);

      return {
        success,
        status: updateStatus
          ? success
            ? ServerStatus.RUNNING
            : ServerStatus.ERROR
          : serverInstance.serverStatus,
        error: errorMessage,
        toolCount: tools.length,
        securityScan,
      };
    },
    {
      timeout: 60000, // 60秒のタイムアウト（セキュリティスキャンのため）
    },
  );
};
