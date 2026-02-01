/**
 * OAuth再認証のための共通ヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { generateAuthorizationUrl } from "../userMcpServer/helpers/generateAuthorizationUrl";
import { discoverOAuthMetadata } from "@/lib/oauth/dcr";

/**
 * OAuthトークンとクライアント情報
 */
type OAuthTokenWithClient = {
  id: string;
  oauthClient: {
    clientId: string;
    clientSecret: string | null;
  };
};

/**
 * テンプレート情報（urlがnull可能）
 */
type TemplateInfo = {
  url: string | null;
};

/**
 * 検証済みOAuthメタデータ
 */
type ValidatedOAuthMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  scopes_supported?: string[];
};

/**
 * Authorization URL生成に必要なパラメータ
 */
type GenerateReauthUrlParams = {
  templateUrl: string;
  oauthToken: OAuthTokenWithClient;
  mcpServerId: string;
  mcpServerTemplateInstanceId: string;
  userId: string;
  organizationId: string;
  redirectTo?: string;
};

/**
 * OAuthトークンを取得（OAuthクライアント情報を含む）
 */
export const fetchOAuthTokenWithClient = async (
  tx: PrismaTransactionClient,
  userId: string,
  mcpServerTemplateInstanceId: string,
): Promise<OAuthTokenWithClient> => {
  const oauthToken = await tx.mcpOAuthToken.findUnique({
    where: {
      userId_mcpServerTemplateInstanceId: {
        userId,
        mcpServerTemplateInstanceId,
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

  return oauthToken;
};

/**
 * OAuthメタデータを取得してエンドポイント情報を検証
 */
export const fetchAndValidateOAuthMetadata = async (
  templateUrl: string,
): Promise<ValidatedOAuthMetadata> => {
  const metadata = await discoverOAuthMetadata(templateUrl);

  if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "OAuthメタデータの取得に失敗しました。Authorization EndpointまたはToken Endpointが見つかりません。",
    });
  }

  return {
    authorization_endpoint: metadata.authorization_endpoint,
    token_endpoint: metadata.token_endpoint,
    scopes_supported: metadata.scopes_supported,
  };
};

/**
 * 再認証用のAuthorization URLを生成
 */
export const generateReauthenticationUrl = async (
  params: GenerateReauthUrlParams,
): Promise<string> => {
  const {
    templateUrl,
    oauthToken,
    mcpServerId,
    mcpServerTemplateInstanceId,
    userId,
    organizationId,
    redirectTo,
  } = params;

  // OAuthメタデータを取得してエンドポイント情報を取得
  const metadata = await fetchAndValidateOAuthMetadata(templateUrl);

  // Authorization URLを生成
  return generateAuthorizationUrl({
    clientId: oauthToken.oauthClient.clientId,
    clientSecret: oauthToken.oauthClient.clientSecret ?? "",
    authorizationEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
    scopes: metadata.scopes_supported ?? [],
    mcpServerId,
    mcpServerTemplateInstanceId,
    userId,
    organizationId,
    redirectTo,
  });
};

/**
 * テンプレートURLが存在することを検証
 */
export const validateTemplateUrl = (
  template: TemplateInfo | null | undefined,
): string => {
  if (!template?.url) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートのURLが見つかりません",
    });
  }
  return template.url;
};
