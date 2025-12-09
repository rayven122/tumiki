/**
 * OAuthクライアント管理のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { discoverOAuthMetadata } from "@/lib/oauth/dcr";
import { registerOAuthClient } from "./registerOAuthClient";

type OAuthClientInfo = {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
};

type GetOAuthClientInfoParams = {
  tx: PrismaTransactionClient;
  templateId: string;
  serverUrl: string;
  organizationId: string;
  // OAuthクライアント情報（オプション）
  clientId?: string;
  clientSecret?: string;
};

/**
 * OAuthクライアント情報を取得または作成
 * - クライアント情報が指定されている場合: それを優先使用
 * - 既存のOAuthClientが存在する場合: 再利用
 * - 存在しない場合: DCRを実行して新規作成
 */
export const getOrCreateOAuthClient = async (
  params: GetOAuthClientInfoParams,
): Promise<OAuthClientInfo> => {
  const { tx, templateId, serverUrl, organizationId, clientId, clientSecret } =
    params;

  // クライアント情報が指定されている場合は優先使用
  if (clientId && clientSecret) {
    // OAuth metadataを取得してエンドポイントとスコープを取得
    const metadata = await discoverOAuthMetadata(serverUrl);

    // DBに保存（再利用のため）
    const savedClient = await tx.mcpOAuthClient.create({
      data: {
        mcpServerTemplateId: templateId,
        organizationId,
        clientId: clientId,
        clientSecret: clientSecret,
        authorizationServerUrl: serverUrl,
        redirectUris: [],
      },
    });

    return {
      clientId: savedClient.clientId,
      clientSecret: savedClient.clientSecret ?? "",
      authorizationEndpoint:
        typeof metadata.authorization_endpoint === "string"
          ? metadata.authorization_endpoint
          : "",
      tokenEndpoint:
        typeof metadata.token_endpoint === "string"
          ? metadata.token_endpoint
          : "",
      scopes: Array.isArray(metadata.scopes_supported)
        ? metadata.scopes_supported
        : [],
    };
  }

  // 既存のOAuthClientを確認（最新のものを取得）
  const existingOAuthClient = await tx.mcpOAuthClient.findFirst({
    where: {
      mcpServerTemplateId: templateId,
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 既存のOAuthClientが存在する場合は再利用
  if (existingOAuthClient) {
    // OAuth metadataを取得してエンドポイントとスコープを取得
    const metadata = await discoverOAuthMetadata(serverUrl);

    return {
      clientId: existingOAuthClient.clientId,
      clientSecret: existingOAuthClient.clientSecret ?? "",
      authorizationEndpoint:
        typeof metadata.authorization_endpoint === "string"
          ? metadata.authorization_endpoint
          : "",
      tokenEndpoint:
        typeof metadata.token_endpoint === "string"
          ? metadata.token_endpoint
          : "",
      scopes: Array.isArray(metadata.scopes_supported)
        ? metadata.scopes_supported
        : [],
    };
  }

  // 存在しない場合のみDCRを実行してOAuthClientを作成
  const newOAuthClient = await registerOAuthClient({
    tx,
    serverUrl,
    templateId,
    organizationId,
  });

  return {
    clientId: newOAuthClient.clientId,
    clientSecret: newOAuthClient.clientSecret,
    authorizationEndpoint: newOAuthClient.authorizationEndpoint,
    tokenEndpoint: newOAuthClient.tokenEndpoint,
    scopes: newOAuthClient.scopes,
  };
};
