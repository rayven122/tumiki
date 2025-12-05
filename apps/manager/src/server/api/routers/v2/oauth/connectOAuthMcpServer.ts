/**
 * OAuth認証付きMCPサーバー接続 procedure
 * MCPサーバーを作成し、DCRを実行してOAuth認証フローを開始する
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { type ConnectOAuthMcpServerInputV2 } from "./index";
import type { z } from "zod";
import { getOrCreateTemplateInfo } from "../userMcpServer/helpers/server-template";
import { createMcpServer } from "../userMcpServer/helpers/mcp-server-creator";
import { getOrCreateOAuthClient } from "../userMcpServer/helpers/oauth-client-manager";
import { generateAuthorizationUrl } from "../userMcpServer/helpers/generateAuthorizationUrl";

type ConnectOAuthMcpServerInput = z.infer<typeof ConnectOAuthMcpServerInputV2>;

type ConnectOAuthMcpServerOutput = {
  id: string;
  authorizationUrl: string;
};

/**
 * OAuth認証付きMCPサーバーに接続
 *
 * @param tx トランザクションクライアント
 * @param input 接続データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns サーバー情報とOAuth認証URL
 */
export const connectOAuthMcpServer = async (
  tx: PrismaTransactionClient,
  input: ConnectOAuthMcpServerInput,
  organizationId: string,
  userId: string,
): Promise<ConnectOAuthMcpServerOutput> => {
  // 1. テンプレート情報を取得または作成
  const { serverUrl, serverName, templateId } = await getOrCreateTemplateInfo({
    tx,
    templateId: input.templateId,
    customUrl: input.customUrl,
    name: input.name,
    description: input.description,
    transportType: input.transportType,
    userId,
    organizationId,
  });

  // 2. MCPサーバーを作成
  const mcpServer = await createMcpServer({
    tx,
    serverName,
    description: input.description ?? "",
    templateId,
    organizationId,
  });

  // 3. OAuthクライアント情報を取得または作成
  const oauthClient = await getOrCreateOAuthClient({
    tx,
    templateId,
    serverUrl,
    organizationId,
    // クライアント情報を渡す
    clientId: input.clientId,
    clientSecret: input.clientSecret,
  });

  // 4. Authorization URLを生成
  const authorizationUrl = await generateAuthorizationUrl({
    clientId: oauthClient.clientId,
    clientSecret: oauthClient.clientSecret,
    authorizationEndpoint: oauthClient.authorizationEndpoint,
    tokenEndpoint: oauthClient.tokenEndpoint,
    scopes: oauthClient.scopes,
    mcpServerId: mcpServer.id,
    userId,
    organizationId,
  });

  return {
    id: mcpServer.id,
    authorizationUrl,
  };
};
