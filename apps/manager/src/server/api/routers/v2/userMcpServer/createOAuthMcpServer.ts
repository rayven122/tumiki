/**
 * OAuth認証付きMCPサーバー作成 procedure
 * MCPサーバーを作成し、DCRを実行してOAuth認証フローを開始する
 */
import { ServerStatus, ServerType } from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { type CreateRemoteMcpServerInputV2 } from "../remoteMcpServer";
import type { z } from "zod";
import { registerOAuthClient } from "./helpers/registerOAuthClient";
import { generateAuthorizationUrl } from "./helpers/generateAuthorizationUrl";

type CreateOAuthMcpServerInput = z.infer<typeof CreateRemoteMcpServerInputV2>;

type CreateOAuthMcpServerOutput = {
  id: string;
  authorizationUrl: string;
};

/**
 * OAuth認証付きMCPサーバーを作成
 *
 * @param tx トランザクションクライアント
 * @param input 作成データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 作成されたサーバー情報とOAuth認証要否
 */
export const createOAuthMcpServer = async (
  tx: PrismaTransactionClient,
  input: CreateOAuthMcpServerInput,
  organizationId: string,
  userId: string,
): Promise<CreateOAuthMcpServerOutput> => {
  // テンプレートIDまたはカスタムURLのいずれかが必要
  if (!input.templateId && !input.customUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "テンプレートIDまたはカスタムURLが必要です",
    });
  }

  // テンプレートから情報を取得
  let serverUrl: string;
  let serverName: string;

  if (input.templateId) {
    const template = await tx.mcpServerTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCPサーバーテンプレートが見つかりません",
      });
    }

    if (!template.url || template.authType !== "OAUTH") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "テンプレートの認証方法がOAuthではありません",
      });
    }

    serverUrl = template.url;
    serverName = input.name ?? template.name;
  } else {
    // カスタムURL
    if (!input.customUrl || !input.name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "カスタムサーバーにはURLと名前が必要です",
      });
    }

    serverUrl = input.customUrl;
    serverName = input.name;
  }

  const mcpServer = await tx.mcpServer.create({
    data: {
      name: serverName,
      description: input.description ?? "",
      iconPath: null,
      serverStatus: ServerStatus.PENDING,
      serverType: ServerType.OFFICIAL,
      authType: "API_KEY",
      organizationId,
      ...(input.templateId && {
        mcpServers: {
          connect: { id: input.templateId },
        },
      }),
    },
  });

  // DCRを実行してOAuthClientを作成
  const oauthClient = await registerOAuthClient({
    tx,
    serverUrl,
    serverName,
    templateId: input.templateId,
    organizationId,
  });

  // Authorization URLを生成
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
