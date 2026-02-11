/**
 * OAuth認証付きMCPサーバー接続 procedure
 * MCPサーバーを作成し、DCRを実行してOAuth認証フローを開始する
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus } from "@tumiki/db/prisma";
import { type ConnectOAuthMcpServerInputV2 } from "./router";
import type { z } from "zod";
import { getOrCreateTemplateInfo } from "../helpers/server-template";
import { createOfficialMcpServer } from "../helpers/mcp-server-creator";
import { getOrCreateOAuthClient } from "../helpers/oauth-client-manager";
import { generateAuthorizationUrl } from "../helpers/generateAuthorizationUrl";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";

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
  const { serverUrl, serverName, templateId, iconPath } =
    await getOrCreateTemplateInfo({
      tx,
      templateId: input.templateId,
      customUrl: input.customUrl,
      name: input.name,
      description: input.description,
      transportType: input.transportType,
      userId,
      organizationId,
    });

  // 2. 同じテンプレートの既存PENDINGサーバーをクリーンアップ
  // OAuth認証が途中で中断された場合の残骸を削除
  await tx.mcpServer.deleteMany({
    where: {
      organizationId,
      serverStatus: ServerStatus.PENDING,
      templateInstances: {
        some: {
          mcpServerTemplateId: templateId,
        },
      },
    },
  });

  // 3. 公式MCPサーバーを作成
  const mcpServer = await createOfficialMcpServer({
    tx,
    serverName,
    slug: input.slug,
    description: input.description ?? "",
    templateId,
    organizationId,
    normalizedName: normalizeServerName(serverName),
    iconPath,
  });

  // 4. OAuthクライアント情報を取得または作成
  const oauthClient = await getOrCreateOAuthClient({
    tx,
    templateId,
    serverUrl,
    organizationId,
    // クライアント情報を渡す
    clientId: input.clientId,
    clientSecret: input.clientSecret,
  });

  // 5. Authorization URLを生成
  const authorizationUrl = await generateAuthorizationUrl({
    clientId: oauthClient.clientId,
    clientSecret: oauthClient.clientSecret,
    authorizationEndpoint: oauthClient.authorizationEndpoint,
    tokenEndpoint: oauthClient.tokenEndpoint,
    scopes: oauthClient.scopes,
    mcpServerId: mcpServer.id,
    mcpServerTemplateInstanceId: mcpServer.templateInstanceId,
    userId,
    organizationId,
  });

  return {
    id: mcpServer.id,
    authorizationUrl,
  };
};
