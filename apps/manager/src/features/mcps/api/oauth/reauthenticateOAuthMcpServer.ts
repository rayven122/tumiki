/**
 * OAuth再認証 procedure
 * 既存のMCPサーバーに対してOAuth認証のみを再実行する
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { ReauthenticateOAuthMcpServerInputV2 } from "./router";
import {
  fetchOAuthClientForTemplate,
  fetchOAuthTokenWithClient,
  generateReauthenticationUrl,
} from "./reauthHelpers";

type ReauthenticateOAuthMcpServerInput = z.infer<
  typeof ReauthenticateOAuthMcpServerInputV2
>;

type ReauthenticateOAuthMcpServerOutput = {
  authorizationUrl: string;
};

/**
 * OAuth再認証を実行
 * 既存のMCPサーバーに対してOAuth認証のみを再実行する
 *
 * @param tx トランザクションクライアント
 * @param input 入力データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns Authorization URL
 */
export const reauthenticateOAuthMcpServer = async (
  tx: PrismaTransactionClient,
  input: ReauthenticateOAuthMcpServerInput,
  organizationId: string,
  userId: string,
): Promise<ReauthenticateOAuthMcpServerOutput> => {
  // 1. MCPサーバーテンプレートインスタンスを取得（権限チェック含む）
  const templateInstance = await tx.mcpServerTemplateInstance.findUnique({
    where: { id: input.mcpServerTemplateInstanceId },
    include: {
      mcpServer: {
        select: {
          id: true,
          organizationId: true,
        },
      },
      mcpServerTemplate: {
        select: {
          id: true,
          url: true,
          authType: true,
        },
      },
    },
  });

  if (
    !templateInstance ||
    templateInstance.mcpServer.organizationId !== organizationId
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  const template = templateInstance.mcpServerTemplate;
  if (!template?.authType || template.authType !== "OAUTH") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "このサーバーはOAuth認証に対応していません",
    });
  }

  if (!template.url) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートのURLが見つかりません",
    });
  }

  // 2. 既存のOAuthトークン情報を取得（OAuthクライアント情報も含む）
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
    (await fetchOAuthClientForTemplate(tx, template.id, organizationId));

  // 3. Authorization URLを生成
  const authorizationUrl = await generateReauthenticationUrl({
    templateUrl: template.url,
    oauthClient,
    mcpServerId: templateInstance.mcpServer.id,
    mcpServerTemplateInstanceId: templateInstance.id,
    userId,
    organizationId,
    redirectTo: input.redirectTo,
  });

  return {
    authorizationUrl,
  };
};
