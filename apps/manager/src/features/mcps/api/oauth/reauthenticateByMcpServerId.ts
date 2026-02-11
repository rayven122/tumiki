/**
 * mcpServerId ベースの OAuth 再認証
 * チャット画面で401エラーが発生した場合に使用
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ReauthenticateByMcpServerIdInputV2 } from "./router";
import {
  fetchOAuthClientForTemplate,
  fetchOAuthTokenWithClient,
  generateReauthenticationUrl,
  validateTemplateUrl,
} from "./reauthHelpers";

type ReauthenticateByMcpServerIdInput = z.infer<
  typeof ReauthenticateByMcpServerIdInputV2
>;

type ReauthenticateByMcpServerIdOutput = {
  authorizationUrl: string;
};

/**
 * mcpServerId ベースで OAuth 再認証を実行
 *
 * MCPサーバーに紐づく最初のOAuth認証が必要なテンプレートインスタンスを取得し、
 * 再認証URLを生成する
 */
export const reauthenticateByMcpServerId = async (
  tx: PrismaTransactionClient,
  input: ReauthenticateByMcpServerIdInput,
  organizationId: string,
  userId: string,
): Promise<ReauthenticateByMcpServerIdOutput> => {
  // 1. MCPサーバーを取得（権限チェック含む）
  const mcpServer = await tx.mcpServer.findUnique({
    where: {
      id: input.mcpServerId,
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      templateInstances: {
        where: {
          isEnabled: true,
          mcpServerTemplate: {
            authType: "OAUTH",
          },
        },
        select: {
          id: true,
          mcpServerTemplate: {
            select: {
              id: true,
              url: true,
              authType: true,
            },
          },
        },
        take: 1, // 最初のOAuth認証が必要なインスタンスのみ
      },
    },
  });

  if (!mcpServer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  const templateInstance = mcpServer.templateInstances[0];
  if (!templateInstance) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "このサーバーにはOAuth認証が必要なテンプレートがありません",
    });
  }

  // 2. テンプレートURLを検証
  const templateUrl = validateTemplateUrl(templateInstance.mcpServerTemplate);

  // 3. 既存のOAuthトークン情報を取得（OAuthクライアント情報も含む）
  const oauthToken = await fetchOAuthTokenWithClient(
    tx,
    userId,
    templateInstance.id,
  );

  // OAuthクライアント情報を取得
  // トークンがある場合はそのクライアント情報を使用
  // トークンがない場合（招待ユーザーなど）は組織のOAuthClientを取得
  const oauthClient =
    oauthToken?.oauthClient ??
    (await fetchOAuthClientForTemplate(
      tx,
      templateInstance.mcpServerTemplate.id,
      organizationId,
    ));

  // 4. Authorization URLを生成
  const authorizationUrl = await generateReauthenticationUrl({
    templateUrl,
    oauthClient,
    mcpServerId: mcpServer.id,
    mcpServerTemplateInstanceId: templateInstance.id,
    userId,
    organizationId,
    redirectTo: input.redirectTo,
  });

  return {
    authorizationUrl,
  };
};
