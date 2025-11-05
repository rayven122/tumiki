/**
 * リモートMCPサーバー作成
 */

import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type CreateRemoteMcpServerInput } from ".";
import { performDCR, DCRError } from "@/lib/oauth/dcr";
import { getOAuthRedirectUri } from "@/lib/oauth/utils";

type CreateRemoteMcpServerProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof CreateRemoteMcpServerInput>;
};

export const createRemoteMcpServer = async ({
  ctx,
  input,
}: CreateRemoteMcpServerProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;
  const currentOrganizationId = ctx.currentOrganizationId;

  // バリデーション
  if (!input.customUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "URL is required",
    });
  }

  if (input.authType === "OAUTH" && !input.oauthProvider) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "OAuth provider is required for OAuth authentication",
    });
  }

  // 組織の検証
  let organizationId: string | null = null;
  if (input.visibility === "ORGANIZATION") {
    const inputOrganizationId = input.organizationId ?? null;
    if (!inputOrganizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Organization ID is required for organization visibility",
      });
    }

    // ユーザーが組織に所属しているかチェック
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          userId,
          organizationId: inputOrganizationId,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    organizationId = inputOrganizationId;
  }

  // MCPサーバーを作成（トランザクション）
  const result = await db.$transaction(async (tx) => {
    // MCPサーバーを作成
    const mcpServer = await tx.mcpServer.create({
      data: {
        name: input.name,
        description: input.description,
        transportType: "STREAMABLE_HTTPS", // リモートサーバーはHTTPS
        url: input.customUrl,
        envVars: [], // 環境変数はUserMcpServerConfigで管理
        authType: input.authType,
        oauthProvider: input.oauthProvider,
        oauthScopes: input.scopes ?? [],
        serverType: "CUSTOM", // ユーザーが追加したリモートサーバー
        createdBy: userId,
        visibility: input.visibility,
        organizationId,
        isPublic: input.visibility === "PUBLIC",
      },
    });

    // DCR（Dynamic Client Registration）実行
    if (input.authType === "OAUTH" && input.customUrl) {
      try {
        // リダイレクトURIを構築
        // 注: 環境変数が未設定の場合はデフォルト値を使用
        const redirectUri = getOAuthRedirectUri();

        // DCRを実行
        const dcrResult = await performDCR(
          input.customUrl,
          input.name,
          [redirectUri],
          input.scopes?.join(" "),
        );

        // OAuthClientレコードを作成
        await tx.oAuthClient.create({
          data: {
            mcpServerId: mcpServer.id,
            clientId: dcrResult.registration.client_id,
            clientSecret: dcrResult.registration.client_secret ?? null,
            authorizationServerUrl: dcrResult.metadata.issuer,
            authorizationEndpoint: dcrResult.metadata.authorization_endpoint,
            tokenEndpoint: dcrResult.metadata.token_endpoint,
            registrationEndpoint:
              dcrResult.metadata.registration_endpoint ?? null,
            registrationAccessToken:
              dcrResult.registration.registration_access_token ?? null,
            scopes:
              dcrResult.registration.scope?.split(" ") ?? input.scopes ?? [],
            grantTypes: dcrResult.registration.grant_types ?? [
              "authorization_code",
            ],
            responseTypes: dcrResult.registration.response_types ?? ["code"],
            tokenEndpointAuthMethod:
              dcrResult.registration.token_endpoint_auth_method ??
              "client_secret_post",
            redirectUris: dcrResult.registration.redirect_uris ?? [redirectUri],
          },
        });
      } catch (error) {
        if (error instanceof DCRError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `DCR failed: ${error.message}`,
            cause: error,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform Dynamic Client Registration",
          cause: error,
        });
      }
    }

    // UserMcpServerConfigを作成
    let envVarsJson = "{}";
    if (input.authType === "API_KEY" && input.credentials) {
      envVarsJson = JSON.stringify(input.credentials.envVars ?? {});
    }

    const userMcpConfig = await tx.userMcpServerConfig.create({
      data: {
        name: mcpServer.name,
        description: input.description ?? "",
        mcpServerId: mcpServer.id,
        envVars: envVarsJson,
        organizationId: currentOrganizationId,
      },
    });

    return {
      mcpServer,
      userMcpConfig,
    };
  });

  return {
    mcpServer: result.mcpServer,
    userMcpConfigId: result.userMcpConfig.id,
    // OAuth認証が必要な場合はフロントエンドでinitiateOAuthを呼び出す
    requiresOAuth: input.authType === "OAUTH",
  };
};
