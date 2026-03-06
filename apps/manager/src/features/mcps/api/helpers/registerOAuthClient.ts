/**
 * OAuth Client登録ヘルパー
 * DCRを実行してMcpOAuthClientをデータベースに作成する
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { performDCR, DCRError } from "@/lib/oauth/dcr";
import { getOAuthRedirectUri } from "@/lib/url";

export type RegisterOAuthClientParams = {
  tx: PrismaTransactionClient;
  serverUrl: string;
  templateId: string;
  organizationId: string;
};

export type RegisterOAuthClientResult = {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
};

/**
 * OAuth Clientを登録
 *
 * @param params パラメータオブジェクト
 * @param params.tx トランザクションクライアント
 * @param params.serverUrl OAuth Authorization ServerのURL
 * @param params.templateId テンプレートID（必須）
 * @param params.organizationId 組織ID
 * @returns OAuth Client情報
 */
export const registerOAuthClient = async ({
  tx,
  serverUrl,
  templateId,
  organizationId,
}: RegisterOAuthClientParams): Promise<RegisterOAuthClientResult> => {
  const redirectUri = getOAuthRedirectUri();

  // DCRを実行
  let dcrResult;
  try {
    dcrResult = await performDCR(
      serverUrl,
      [redirectUri],
      "", // DCRにすべてのscopesを検出させる
      undefined,
      undefined,
    );
  } catch (error) {
    if (error instanceof DCRError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `DCR失敗: ${error.message}`,
        cause: error,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Dynamic Client Registration に失敗しました",
      cause: error,
    });
  }

  // DCRで取得したスコープを使用
  const scopes = Array.isArray(dcrResult.metadata.scopes_supported)
    ? dcrResult.metadata.scopes_supported
    : [];

  // Registrationレスポンスから値を取得
  const registration = dcrResult.registration;
  const clientId =
    typeof registration.client_id === "string" ? registration.client_id : "";
  const clientSecret =
    typeof registration.client_secret === "string"
      ? registration.client_secret
      : null;
  const registrationAccessToken =
    typeof registration.registration_access_token === "string"
      ? registration.registration_access_token
      : null;
  const registrationClientUri =
    typeof registration.registration_client_uri === "string"
      ? registration.registration_client_uri
      : null;
  const redirectUris = Array.isArray(registration.redirect_uris)
    ? registration.redirect_uris.filter(
        (uri): uri is string => typeof uri === "string",
      )
    : [redirectUri];

  // OAuthClientレコードを作成
  await tx.mcpOAuthClient.create({
    data: {
      mcpServerTemplateId: templateId,
      organizationId,
      clientId,
      clientSecret,
      authorizationServerUrl: dcrResult.metadata.issuer,
      registrationAccessToken,
      registrationClientUri,
      redirectUris,
    },
  });

  if (
    typeof dcrResult.metadata.authorization_endpoint !== "string" ||
    typeof dcrResult.metadata.token_endpoint !== "string"
  ) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "OAuth server metadata is missing required endpoints",
    });
  }

  return {
    clientId,
    clientSecret: clientSecret ?? "",
    authorizationEndpoint: dcrResult.metadata.authorization_endpoint,
    tokenEndpoint: dcrResult.metadata.token_endpoint,
    scopes,
  };
};
