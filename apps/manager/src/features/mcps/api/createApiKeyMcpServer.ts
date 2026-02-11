import type { z } from "zod";
import type { CreateApiKeyMcpServerInputV2 } from "./router";
import {
  ServerStatus,
  ServerType,
  TransportType,
  McpServerVisibility,
  AuthType,
} from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { Prisma } from "@tumiki/db/prisma";
import type { McpServerTemplate } from "@tumiki/db/prisma";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";
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
 * MCPサーバーインスタンスを作成（テンプレートとツールから）
 */
const createMcpServerInstance = async (
  prisma: PrismaTransactionClient,
  params: {
    name: string;
    slug: string;
    description: string;
    iconPath: string | null;
    organizationId: string;
    userId: string;
    template: McpServerTemplate;
    tools: Array<{ id: string }>;
    envVars?: Record<string, string>;
  },
): Promise<CreateApiKeyMcpServerOutput> => {
  const mcpServer = await prisma.mcpServer.create({
    data: {
      name: params.name,
      slug: params.slug,
      description: params.description,
      iconPath: params.iconPath,
      serverStatus: ServerStatus.RUNNING,
      serverType: ServerType.OFFICIAL,
      authType: AuthType.OAUTH,
      organizationId: params.organizationId,
      templateInstances: {
        create: {
          mcpServerTemplateId: params.template.id,
          normalizedName: normalizeServerName(params.name),
          isEnabled: true,
          displayOrder: 0,
          allowedTools: {
            connect: params.tools,
          },
          // McpConfigの作成（環境変数がある場合のみ）
          ...(params.envVars
            ? {
                mcpConfigs: {
                  create: {
                    organizationId: params.organizationId,
                    userId: params.userId,
                    envVars: JSON.stringify(params.envVars),
                  },
                },
              }
            : {}),
        },
      },
    },
  });

  return {
    id: mcpServer.id,
  };
};

/**
 * 既存のテンプレートを使用してMCPサーバーを作成
 *
 * @param prisma Prismaクライアント
 * @param input 作成データ
 * @param organizationId 組織ID
 * @param userId ユーザーID
 * @returns 作成されたサーバー情報
 */
const createFromExistingTemplate = async (
  prisma: PrismaTransactionClient,
  input: CreateApiKeyMcpServerInput & { mcpServerTemplateId: string },
  organizationId: string,
  userId: string,
): Promise<CreateApiKeyMcpServerOutput> => {
  // 1. テンプレートを取得
  const template = await prisma.mcpServerTemplate.findUnique({
    where: { id: input.mcpServerTemplateId },
    include: {
      mcpTools: true,
    },
  });

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  // 2. バリデーション
  if (template.transportType === "STDIO") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "STDIOタイプのMCPサーバーはサポートされていません。リモートMCPサーバーを使用してください。",
    });
  }

  if (input.envVars) {
    const envVars = Object.keys(input.envVars);
    const isEnvVarsMatch = envVars.every((envVar) =>
      template.envVarKeys.includes(envVar),
    );
    if (!isEnvVarsMatch) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "MCPサーバーの環境変数が一致しません",
      });
    }
  }

  // 3. MCPサーバーインスタンスを作成
  return createMcpServerInstance(prisma, {
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    iconPath: template.iconPath,
    organizationId,
    userId,
    template,
    tools: template.mcpTools.map((tool) => ({ id: tool.id })),
    envVars: input.envVars,
  });
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
  // 1. ユーザー専用のカスタムテンプレートを作成
  let customTemplate: McpServerTemplate;
  try {
    customTemplate = await prisma.mcpServerTemplate.create({
      data: {
        name: input.name,
        normalizedName: normalizeServerName(input.name),
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
  } catch (error) {
    // 名前重複エラー（P2002: Unique constraint failed）の場合
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "既存のMCPサーバーテンプレートと同じ名前は使えません。MCPサーバーテンプレート一覧を確認してください。",
      });
    }
    throw error;
  }

  // 2. カスタムURLからツールを取得
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

  // ツールが取得できない場合はエラー
  if (tools.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `MCPサーバー「${input.name}」（${input.customUrl}）からツールを取得できませんでした。サーバーのURLと通信方式が正しいか確認してください。`,
    });
  }

  // 3. 取得したツールをデータベースに保存
  const createdTools = await prisma.mcpTool.createManyAndReturn({
    data: tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema as object,
      mcpServerTemplateId: customTemplate.id,
    })),
    select: {
      id: true,
    },
  });

  // 4. MCPサーバーインスタンスを作成
  return createMcpServerInstance(prisma, {
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    iconPath: null,
    organizationId,
    userId,
    template: customTemplate,
    tools: createdTools.map((tool) => ({ id: tool.id })),
    envVars: input.envVars,
  });
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
    return createFromExistingTemplate(
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
