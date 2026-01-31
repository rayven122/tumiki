/**
 * mcpServerId ベースの OAuth 再認証
 * チャット画面で401エラーが発生した場合に使用
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { generateAuthorizationUrl } from "../userMcpServer/helpers/generateAuthorizationUrl";
import { discoverOAuthMetadata } from "@/lib/oauth/dcr";
import type { z } from "zod";
import type { ReauthenticateByMcpServerIdInputV2 } from "./index";

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

  const template = templateInstance.mcpServerTemplate;
  if (!template?.url) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートのURLが見つかりません",
    });
  }

  // 2. 既存のOAuthトークン情報を取得（OAuthクライアント情報も含む）
  const oauthToken = await tx.mcpOAuthToken.findUnique({
    where: {
      userId_mcpServerTemplateInstanceId: {
        userId,
        mcpServerTemplateInstanceId: templateInstance.id,
      },
    },
    include: {
      oauthClient: {
        select: {
          clientId: true,
          clientSecret: true,
        },
      },
    },
  });

  if (!oauthToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "OAuth設定が見つかりません。サーバーを再度追加してください。",
    });
  }

  // 3. OAuth メタデータを取得してエンドポイント情報を取得
  const metadata = await discoverOAuthMetadata(template.url);

  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "OAuthメタデータの取得に失敗しました。Authorization EndpointまたはToken Endpointが見つかりません。",
    });
  }

  // 4. Authorization URLを生成
  const authorizationUrl = await generateAuthorizationUrl({
    clientId: oauthToken.oauthClient.clientId,
    clientSecret: oauthToken.oauthClient.clientSecret ?? "",
    authorizationEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
    scopes: metadata.scopes_supported ?? [],
    mcpServerId: mcpServer.id,
    mcpServerTemplateInstanceId: templateInstance.id,
    userId,
    organizationId,
    redirectTo: input.redirectTo, // 認証完了後のリダイレクト先
  });

  return {
    authorizationUrl,
  };
};
