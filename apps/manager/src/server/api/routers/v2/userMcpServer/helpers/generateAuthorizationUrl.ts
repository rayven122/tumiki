/**
 * OAuth Authorization URL生成ヘルパー
 * PKCEパラメータとState トークンを生成し、Authorization URLを返す
 */
import { generatePKCEParams } from "@/lib/oauth/pkce";
import { createStateToken } from "@/lib/oauth/state-token";
import { getOAuthRedirectUri } from "@/lib/url";
import { generateAuthorizationUrl as buildAuthUrl } from "@/lib/oauth/oauth-client";
import type * as oauth from "oauth4webapi";

export type GenerateAuthorizationUrlParams = {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  mcpServerId: string;
  mcpServerTemplateInstanceId: string;
  userId: string;
  organizationId: string;
  /** 認証完了後のリダイレクト先（例: /org-slug/chat/chat-id） */
  redirectTo?: string;
};

/**
 * OAuth Authorization URLを生成
 *
 * @param params パラメータオブジェクト
 * @param params.clientId OAuth Client ID
 * @param params.clientSecret OAuth Client Secret
 * @param params.authorizationEndpoint Authorization Endpoint URL
 * @param params.tokenEndpoint Token Endpoint URL
 * @param params.scopes 要求するスコープ配列
 * @param params.mcpServerId MCPサーバーID
 * @param params.userId ユーザーID
 * @param params.organizationId 組織ID
 * @returns Authorization URL
 */
export const generateAuthorizationUrl = async ({
  clientId,
  clientSecret,
  authorizationEndpoint,
  tokenEndpoint,
  scopes,
  mcpServerId,
  mcpServerTemplateInstanceId,
  userId,
  organizationId,
  redirectTo,
}: GenerateAuthorizationUrlParams): Promise<string> => {
  // Vercel環境では自動的にVERCEL_URLを使用してリダイレクトURIを構築
  const redirectUri = getOAuthRedirectUri();

  // PKCEパラメータを生成
  const pkceParams = await generatePKCEParams();

  // State トークンを作成（PKCE パラメータと context を含む）
  const stateToken = await createStateToken({
    state: pkceParams.state,
    codeVerifier: pkceParams.codeVerifier,
    codeChallenge: pkceParams.codeChallenge,
    nonce: pkceParams.nonce,
    mcpServerId,
    mcpServerTemplateInstanceId,
    userId,
    organizationId,
    redirectUri,
    requestedScopes: scopes,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10分
    redirectTo, // 認証完了後のリダイレクト先
  });

  // OAuth AuthorizationServerオブジェクトを構築
  const authServer: oauth.AuthorizationServer = {
    issuer: new URL(authorizationEndpoint).origin,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
  };

  // OAuth Clientオブジェクトを構築
  const client: oauth.Client = {
    client_id: clientId,
    ...(clientSecret && { client_secret: clientSecret }),
  };

  // Authorization URLを生成
  const authUrl = buildAuthUrl(authServer, client, {
    redirectUri,
    scopes,
    state: stateToken,
    codeChallenge: pkceParams.codeChallenge,
  });

  return authUrl.toString();
};
