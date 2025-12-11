/**
 * OAuth認証付き統合MCPサーバー用の認証開始
 * 個別のOfficialMCPサーバーを作成し、OAuth認証フローを開始する
 * （統合サーバー作成時にこのテンプレートインスタンスとトークンを再利用）
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { type ConnectOAuthForIntegratedInputV2 } from "./index";
import type { z } from "zod";
import { getOrCreateTemplateInfo } from "../userMcpServer/helpers/server-template";
import { createOfficialMcpServer } from "../userMcpServer/helpers/mcp-server-creator";
import { getOrCreateOAuthClient } from "../userMcpServer/helpers/oauth-client-manager";
import { normalizeServerName } from "@/utils/normalizeServerName";
import { generatePKCEParams } from "@/lib/oauth/pkce";
import { createStateToken } from "@/lib/oauth/state-token";
import { getOAuthRedirectUri } from "@/lib/oauth/utils";
import { generateAuthorizationUrl as buildAuthUrl } from "@/lib/oauth/oauth-client";
import type * as oauth from "oauth4webapi";

type ConnectOAuthForIntegratedInput = z.infer<
  typeof ConnectOAuthForIntegratedInputV2
>;

type ConnectOAuthForIntegratedOutput = {
  authorizationUrl: string;
};

/**
 * OAuth認証付き統合MCPサーバー用の認証を開始
 *
 * @param tx トランザクションクライアント
 * @param input 接続データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns OAuth認証URL
 */
export const connectOAuthForIntegrated = async (
  tx: PrismaTransactionClient,
  input: ConnectOAuthForIntegratedInput,
  organizationId: string,
  userId: string,
): Promise<ConnectOAuthForIntegratedOutput> => {
  // 1. テンプレート情報を取得
  const { serverUrl, serverName, templateId } = await getOrCreateTemplateInfo({
    tx,
    templateId: input.templateId,
    customUrl: undefined,
    name: undefined,
    description: undefined,
    transportType: undefined,
    userId,
    organizationId,
  });

  // 2. 個別のOfficialMCPサーバーを作成（統合サーバー作成時に再利用）
  const mcpServer = await createOfficialMcpServer({
    tx,
    serverName,
    description: "",
    templateId,
    organizationId,
    normalizedName: normalizeServerName(serverName),
  });

  // 3. OAuthクライアント情報を取得または作成
  const oauthClient = await getOrCreateOAuthClient({
    tx,
    templateId,
    serverUrl,
    organizationId,
  });

  // 4. リダイレクトURIを取得
  const redirectUri = getOAuthRedirectUri();

  // 5. PKCEパラメータを生成
  const pkceParams = await generatePKCEParams();

  // 6. State tokenを作成（統合フロー用フラグを含む）
  const stateToken = await createStateToken({
    state: pkceParams.state,
    codeVerifier: pkceParams.codeVerifier,
    codeChallenge: pkceParams.codeChallenge,
    nonce: pkceParams.nonce,
    mcpServerId: mcpServer.id,
    mcpServerTemplateInstanceId: mcpServer.templateInstanceId,
    userId,
    organizationId,
    redirectUri,
    requestedScopes: oauthClient.scopes,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10分
    // 統合フロー用の追加情報
    isIntegratedFlow: true,
    templateId,
  });

  // 7. OAuth AuthorizationServerオブジェクトを構築
  const authServer: oauth.AuthorizationServer = {
    issuer: new URL(oauthClient.authorizationEndpoint).origin,
    authorization_endpoint: oauthClient.authorizationEndpoint,
    token_endpoint: oauthClient.tokenEndpoint,
  };

  // 8. OAuth Clientオブジェクトを構築
  const client: oauth.Client = {
    client_id: oauthClient.clientId,
    ...(oauthClient.clientSecret && {
      client_secret: oauthClient.clientSecret,
    }),
  };

  // 9. Authorization URLを生成
  const authUrl = buildAuthUrl(authServer, client, {
    redirectUri,
    scopes: oauthClient.scopes,
    state: stateToken,
    codeChallenge: pkceParams.codeChallenge,
  });

  return { authorizationUrl: authUrl.toString() };
};
