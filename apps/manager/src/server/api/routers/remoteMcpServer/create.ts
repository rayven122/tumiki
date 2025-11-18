/**
 * リモートMCPサーバー作成
 */

import { type z } from "zod";
import { type ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type CreateRemoteMcpServerInput } from ".";
import { performDCR, DCRError } from "@/lib/oauth/dcr";
import { getOAuthRedirectUri } from "@/lib/oauth/utils";
import { getMcpServerToolsHTTP } from "@/utils/getMcpServerTools";
import { createUserServerComponents } from "../_shared/createUserServerComponents";

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

  // OAuth認証が必要な場合、ツール取得をスキップ（認証後に取得）
  const skipToolFetch = input.authType === "OAUTH";
  let tools: Array<{
    name: string;
    description?: string;
    inputSchema: unknown;
  }> = [];

  // OAuth以外の認証の場合、事前にツールを取得
  if (!skipToolFetch) {
    try {
      // 環境変数をヘッダーとして準備
      const headers = input.credentials?.envVars ?? {};

      // STREAMABLE_HTTPSの場合はHTTPで接続
      tools = await getMcpServerToolsHTTP(
        {
          name: input.name,
          url: input.customUrl,
        },
        headers,
      );

      if (!tools || tools.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "指定されたMCPサーバーのツールが取得できませんでした",
        });
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `MCPサーバーへの接続に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  // MCPサーバーを作成（トランザクション）
  const result = await db.$transaction(async (tx) => {
    // MCPサーバーを作成
    const mcpServer = await tx.mcpServer.create({
      include: {
        tools: true,
      },
      data: {
        name: input.name,
        description: input.description,
        transportType: "STREAMABLE_HTTPS", // リモートサーバーはHTTPS
        url: input.customUrl,
        envVars: input.credentials?.envVars
          ? Object.keys(input.credentials.envVars)
          : [],
        authType: input.authType,
        oauthProvider: input.oauthProvider,
        oauthScopes: input.scopes ?? [],
        serverType: "OFFICIAL", // リモートMCPもOFFICIAL扱い
        createdBy: userId,
        visibility: input.visibility,
        organizationId,
        isPublic: input.visibility === "PUBLIC",
        tools: skipToolFetch
          ? undefined
          : {
              createMany: {
                data: tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description ?? "",
                  inputSchema: tool.inputSchema as object,
                })),
              },
            },
      },
    });

    // DCR（Dynamic Client Registration）実行
    if (input.authType === "OAUTH" && input.customUrl) {
      try {
        // リダイレクトURIを構築
        // 注: 環境変数が未設定の場合はデフォルト値を使用
        const redirectUri = getOAuthRedirectUri();

        // 手動でclient credentialsが入力されている場合
        const hasManualCredentials =
          input.credentials?.clientId && input.credentials?.clientSecret;

        if (hasManualCredentials) {
          // 手動入力の場合: メタデータのみ取得してOAuthClientを作成
          const { discoverOAuthMetadata } = await import("@/lib/oauth/dcr");
          const metadata = await discoverOAuthMetadata(input.customUrl);

          await tx.oAuthClient.create({
            data: {
              mcpServerId: mcpServer.id,
              clientId: input.credentials!.clientId!,
              clientSecret: input.credentials!.clientSecret!,
              authorizationServerUrl: metadata.issuer,
              authorizationEndpoint: metadata.authorization_endpoint,
              tokenEndpoint: metadata.token_endpoint,
              registrationEndpoint: metadata.registration_endpoint ?? null,
              registrationAccessToken: null,
              scopes: input.scopes ?? [],
              grantTypes: ["authorization_code"],
              responseTypes: ["code"],
              tokenEndpointAuthMethod: "client_secret_post",
              redirectUris: [redirectUri],
            },
          });
        } else {
          // 自動取得の場合: DCRを実行
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
              redirectUris: dcrResult.registration.redirect_uris ?? [
                redirectUri,
              ],
            },
          });
        }
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

    // OAuth認証待ちの場合は、インスタンスをPENDINGステータスで作成
    // OAuth以外の場合は、通常通りRUNNINGステータスで作成
    let userComponents;
    if (!skipToolFetch && mcpServer.tools.length > 0) {
      // ツールが取得できている場合のみ、インスタンスを作成
      const envVars = input.credentials?.envVars ?? {};
      userComponents = await createUserServerComponents({
        tx,
        mcpServer,
        envVars,
        instanceName: input.name,
        instanceDescription: input.description ?? "",
        organizationId: currentOrganizationId,
        userId,
        isPending: false,
      });
    } else {
      // OAuth認証待ちの場合、UserMcpServerConfigのみ作成
      const envVarsJson =
        input.authType === "API_KEY" && input.credentials
          ? JSON.stringify(input.credentials.envVars ?? {})
          : "{}";

      const userMcpConfig = await tx.userMcpServerConfig.create({
        data: {
          name: mcpServer.name,
          description: input.description ?? "",
          mcpServerId: mcpServer.id,
          envVars: envVarsJson,
          organizationId: currentOrganizationId,
        },
      });

      userComponents = {
        serverConfig: userMcpConfig,
        toolGroup: null,
        instance: null,
      };
    }

    return {
      mcpServer,
      userComponents,
    };
  });

  return {
    mcpServer: result.mcpServer,
    userMcpConfigId: result.userComponents.serverConfig.id,
    instanceId: result.userComponents.instance?.id,
    // OAuth認証が必要な場合はフロントエンドでinitiateOAuthを呼び出す
    requiresOAuth: input.authType === "OAUTH",
  };
};
