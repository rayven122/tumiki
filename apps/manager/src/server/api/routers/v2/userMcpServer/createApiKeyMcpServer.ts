import type { z } from "zod";
import type { CreateApiKeyMcpServerInputV2 } from ".";
import {
  ServerStatus,
  ServerType,
  TransportType,
  McpServerVisibility,
} from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import {
  getMcpServerToolsSSE,
  getMcpServerToolsHTTP,
} from "@/utils/getMcpServerTools";

export type CreateApiKeyMcpServerInput = z.infer<
  typeof CreateApiKeyMcpServerInputV2
>;

export type CreateApiKeyMcpServerOutput = {
  id: string;
};

/**
 * テンプレートベースのMCPサーバーを作成
 *
 * @param prisma Prismaクライアント
 * @param input 作成データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 作成されたサーバー情報
 */
const createTemplateMcpServer = async (
  prisma: PrismaTransactionClient,
  input: CreateApiKeyMcpServerInput & { mcpServerTemplateId: string },
  organizationId: string,
  userId: string,
): Promise<CreateApiKeyMcpServerOutput> => {
  const mcpServerTemplate = await prisma.mcpServerTemplate.findUnique({
    where: { id: input.mcpServerTemplateId },
    include: {
      mcpTools: true,
    },
  });

  if (!mcpServerTemplate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  // STDIOタイプのMCPサーバーは廃止済みのため拒否
  if (mcpServerTemplate.transportType === "STDIO") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "STDIOタイプのMCPサーバーはサポートされていません。リモートMCPサーバーを使用してください。",
    });
  }

  // 環境変数の検証
  if (input.envVars) {
    const envVars = Object.keys(input.envVars);
    const isEnvVarsMatch = envVars.every((envVar) =>
      mcpServerTemplate.envVarKeys.includes(envVar),
    );
    if (!isEnvVarsMatch) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "MCPサーバーの環境変数が一致しません",
      });
    }

    // McpConfigの作成（環境変数がある場合のみ）
    await prisma.mcpConfig.create({
      data: {
        mcpServerTemplateId: mcpServerTemplate.id,
        organizationId,
        userId,
        envVars: JSON.stringify(input.envVars),
      },
    });
  }

  // McpServerの作成
  const mcpServer = await prisma.mcpServer.create({
    data: {
      name: input.name,
      description: input.description ?? "",
      iconPath: mcpServerTemplate.iconPath,
      serverStatus: ServerStatus.RUNNING,
      serverType: ServerType.OFFICIAL,
      authType: input.authType,
      organizationId,
      mcpServers: {
        connect: { id: mcpServerTemplate.id },
      },
      allowedTools: {
        connect: mcpServerTemplate.mcpTools.map((tool) => ({ id: tool.id })),
      },
    },
  });

  return {
    id: mcpServer.id,
  };
};

/**
 * カスタムURLからツールを取得してMCPサーバーを作成
 *
 * @param prisma Prismaクライアント
 * @param input 作成データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 作成されたサーバー情報
 */
const createCustomUrlMcpServer = async (
  prisma: PrismaTransactionClient,
  input: CreateApiKeyMcpServerInput & { customUrl: string },
  organizationId: string,
  userId: string,
): Promise<CreateApiKeyMcpServerOutput> => {
  // ユーザー専用のカスタムテンプレートを作成
  const customTemplate = await prisma.mcpServerTemplate.create({
    data: {
      name: input.name,
      description: input.description ?? "",
      tags: [],
      iconPath: null,
      transportType: input.transportType ?? TransportType.STREAMABLE_HTTPS,
      args: [],
      url: input.customUrl,
      envVarKeys: input.envVars ? Object.keys(input.envVars) : [],
      authType: input.authType,
      oauthScopes: [],
      createdBy: userId,
      visibility: McpServerVisibility.PRIVATE,
      organizationId,
    },
  });

  if (input.envVars) {
    // McpConfigを作成
    await prisma.mcpConfig.create({
      data: {
        mcpServerTemplateId: customTemplate.id,
        organizationId,
        userId,
        envVars: JSON.stringify(input.envVars),
      },
    });
  }

  // カスタムURLからツールを取得
  let serverStatus: ServerStatus = ServerStatus.STOPPED;
  let createdToolIds: string[] = [];

  try {
    const tools =
      input.transportType === TransportType.STREAMABLE_HTTPS
        ? await getMcpServerToolsHTTP(
            { name: input.name, url: input.customUrl },
            input.envVars ?? {},
          )
        : await getMcpServerToolsSSE(
            { name: input.name, url: input.customUrl },
            input.envVars ?? {},
          );

    if (tools.length > 0) {
      // 取得したツールをデータベースに保存し、IDを取得
      const createdTools = await Promise.all(
        tools.map((tool) =>
          prisma.mcpTool.create({
            data: {
              name: tool.name,
              description: tool.description ?? "",
              inputSchema: tool.inputSchema as object,
              mcpServerTemplateId: customTemplate.id,
            },
          }),
        ),
      );
      createdToolIds = createdTools.map((tool) => tool.id);
      // ツール取得に成功した場合はRUNNINGステータスに設定
      serverStatus = ServerStatus.RUNNING;
    }
  } catch (error) {
    // ツール取得に失敗した場合でもサーバーは作成するが、STOPPEDのまま
    console.error("Failed to fetch tools from custom URL:", error);
  }

  // McpServerを作成してテンプレートとツールを紐付け
  const mcpServer = await prisma.mcpServer.create({
    data: {
      name: input.name,
      description: input.description ?? "",
      iconPath: null,
      serverStatus,
      serverType: ServerType.OFFICIAL,
      authType: input.authType,
      organizationId,
      mcpServers: {
        connect: { id: customTemplate.id },
      },
      allowedTools: {
        connect: createdToolIds.map((id) => ({ id })),
      },
    },
  });

  return {
    id: mcpServer.id,
  };
};

/**
 * APIキー認証MCPサーバーを作成（テンプレートベースまたはカスタムURL）
 *
 * @param prisma Prismaクライアント（トランザクションクライアントも受け付け）
 * @param input 作成データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 作成されたサーバー情報
 */
export const createApiKeyMcpServer = async (
  prisma: PrismaTransactionClient,
  input: CreateApiKeyMcpServerInput,
  organizationId: string,
  userId: string,
): Promise<CreateApiKeyMcpServerOutput> => {
  // テンプレートベースのサーバー作成
  if (input.mcpServerTemplateId) {
    return createTemplateMcpServer(
      prisma,
      { ...input, mcpServerTemplateId: input.mcpServerTemplateId },
      organizationId,
      userId,
    );
  }

  // カスタムURLベースのサーバー作成
  // ZodスキーマでmcpServerTemplateIdまたはcustomUrlのいずれかが必須と保証されているため、
  // ここに到達する時点でcustomUrlは必ず存在する
  return createCustomUrlMcpServer(
    prisma,
    { ...input, customUrl: input.customUrl! },
    organizationId,
    userId,
  );
};
