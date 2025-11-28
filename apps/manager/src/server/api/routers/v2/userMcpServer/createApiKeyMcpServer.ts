import type { z } from "zod";
import type { CreateApiKeyMcpServerInputV2 } from ".";
import { AuthType, ServerStatus, ServerType } from "@tumiki/db/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TRPCError } from "@trpc/server";

export type CreateApiKeyMcpServerInput = z.infer<
  typeof CreateApiKeyMcpServerInputV2
>;

export type CreateApiKeyMcpServerOutput = {
  id: string;
  mcpConfigId: string;
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
  // テンプレートIDまたはカスタムURLのいずれかが必要
  if (!input.mcpServerTemplateId && !input.customUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "mcpServerTemplateId または customUrl のいずれかが必要です",
    });
  }

  // テンプレートベースのサーバー作成
  if (input.mcpServerTemplateId) {
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
    }

    // McpConfigの作成
    const mcpConfig = await prisma.mcpConfig.create({
      data: {
        mcpServerTemplateId: mcpServerTemplate.id,
        organizationId,
        userId,
        envVars: JSON.stringify(input.envVars ?? {}),
      },
    });

    // McpServerの作成
    const mcpServer = await prisma.mcpServer.create({
      data: {
        name: input.name,
        description: input.description ?? "",
        iconPath: mcpServerTemplate.iconPath,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.API_KEY,
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
      mcpConfigId: mcpConfig.id,
    };
  }

  // カスタムURLベースのサーバー作成
  if (input.customUrl) {
    // McpServerの作成（カスタムURLの場合はMcpConfigなし）
    const mcpServer = await prisma.mcpServer.create({
      data: {
        name: input.name,
        description: input.description ?? "",
        iconPath: null,
        serverStatus: ServerStatus.STOPPED,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.API_KEY,
        organizationId,
      },
    });

    return {
      id: mcpServer.id,
      mcpConfigId: "", // カスタムURLの場合はMcpConfigがないため空文字
    };
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "予期しないエラーが発生しました",
  });
};
