/**
 * OAuth再認証 procedure
 * 既存のMCPサーバーに対してOAuth認証のみを再実行する
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { generateAuthorizationUrl } from "../userMcpServer/helpers/generateAuthorizationUrl";
import { discoverOAuthMetadata } from "@/lib/oauth/dcr";
import type { z } from "zod";
import type { ReauthenticateOAuthMcpServerInputV2 } from "./index";

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
  // 1. MCPサーバーを取得（権限チェック含む）
  const mcpServer = await tx.mcpServer.findUnique({
    where: { id: input.mcpServerId },
    include: {
      mcpServers: {
        select: {
          id: true,
          url: true,
          authType: true,
        },
        take: 1,
      },
    },
  });

  if (!mcpServer || mcpServer.organizationId !== organizationId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーが見つかりません",
    });
  }

  const template = mcpServer.mcpServers[0];
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

  // 2. 既存のOAuthクライアント情報を取得
  const oauthClient = await tx.mcpOAuthClient.findFirst({
    where: {
      mcpServerTemplateId: template.id,
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!oauthClient) {
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
    clientId: oauthClient.clientId,
    clientSecret: oauthClient.clientSecret ?? "",
    authorizationEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
    scopes: metadata.scopes_supported ?? [],
    mcpServerId: mcpServer.id, // 既存のMCPサーバーIDを使用
    userId,
    organizationId,
  });

  return {
    authorizationUrl,
  };
};
