/**
 * OAuth認証付きMCPサーバー接続 procedure
 * MCPサーバーを作成し、DCRを実行してOAuth認証フローを開始する
 */
import {
  ServerStatus,
  ServerType,
  AuthType,
  TransportType,
  McpServerVisibility,
} from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { type ConnectOAuthMcpServerInputV2 } from "./index";
import type { z } from "zod";
import { registerOAuthClient } from "./helpers/registerOAuthClient";
import { generateAuthorizationUrl } from "./helpers/generateAuthorizationUrl";
import { discoverOAuthMetadata } from "@/lib/oauth/dcr";

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
  // テンプレートIDまたはカスタムURLのいずれかが必要
  if (!input.templateId && !input.customUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "テンプレートIDまたはカスタムURLが必要です",
    });
  }

  // テンプレートから情報を取得、またはカスタムテンプレートを作成
  let serverUrl: string;
  let serverName: string;
  let templateId: string;

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

    if (!template.url || template.authType !== AuthType.OAUTH) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "テンプレートの認証方法がOAuthではありません",
      });
    }

    serverUrl = template.url;
    serverName = input.name ?? template.name;
    templateId = input.templateId;
  } else {
    // カスタムURL: ユーザー専用のMcpServerTemplateを作成
    if (!input.customUrl || !input.name) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "カスタムサーバーにはURLと名前が必要です",
      });
    }

    serverUrl = input.customUrl;
    serverName = input.name;

    // ユーザー専用のカスタムテンプレートを作成
    const customTemplate = await tx.mcpServerTemplate.create({
      data: {
        name: serverName,
        description: input.description ?? "",
        tags: [],
        iconPath: null,
        transportType: input.transportType ?? TransportType.SSE,
        args: [],
        url: serverUrl,
        envVarKeys: [],
        authType: AuthType.OAUTH,
        oauthScopes: [],
        createdBy: userId,
        visibility: McpServerVisibility.PRIVATE,
        organizationId,
      },
    });

    templateId = customTemplate.id;
  }

  const mcpServer = await tx.mcpServer.create({
    data: {
      name: serverName,
      description: input.description ?? "",
      iconPath: null,
      serverStatus: ServerStatus.PENDING,
      serverType: ServerType.OFFICIAL,
      authType: AuthType.OAUTH,
      organizationId,
      mcpServers: {
        connect: { id: templateId },
      },
    },
  });

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

  let clientId: string;
  let clientSecret: string;
  let authorizationEndpoint: string;
  let tokenEndpoint: string;
  let scopes: string[];

  // 既存のOAuthClientが存在する場合は再利用
  if (existingOAuthClient) {
    // OAuth metadataを取得してエンドポイントとスコープを取得
    const metadata = await discoverOAuthMetadata(serverUrl);

    clientId = existingOAuthClient.clientId;
    clientSecret = existingOAuthClient.clientSecret ?? "";
    authorizationEndpoint =
      typeof metadata.authorization_endpoint === "string"
        ? metadata.authorization_endpoint
        : "";
    tokenEndpoint =
      typeof metadata.token_endpoint === "string"
        ? metadata.token_endpoint
        : "";
    scopes = Array.isArray(metadata.scopes_supported)
      ? metadata.scopes_supported
      : [];
  } else {
    // 存在しない場合のみDCRを実行してOAuthClientを作成
    const newOAuthClient = await registerOAuthClient({
      tx,
      serverUrl,
      templateId,
      organizationId,
    });

    clientId = newOAuthClient.clientId;
    clientSecret = newOAuthClient.clientSecret;
    authorizationEndpoint = newOAuthClient.authorizationEndpoint;
    tokenEndpoint = newOAuthClient.tokenEndpoint;
    scopes = newOAuthClient.scopes;
  }

  // Authorization URLを生成
  const authorizationUrl = await generateAuthorizationUrl({
    clientId,
    clientSecret,
    authorizationEndpoint,
    tokenEndpoint,
    scopes,
    mcpServerId: mcpServer.id,
    userId,
    organizationId,
  });

  return {
    id: mcpServer.id,
    authorizationUrl,
  };
};
