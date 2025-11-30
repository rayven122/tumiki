/**
 * MCPサーバーテンプレート関連のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import {
  AuthType,
  TransportType,
  McpServerVisibility,
} from "@tumiki/db/server";
import { TRPCError } from "@trpc/server";

type TemplateInfo = {
  serverUrl: string;
  serverName: string;
  templateId: string;
};

type GetTemplateInfoParams = {
  tx: PrismaTransactionClient;
  templateId?: string;
  customUrl?: string;
  name?: string;
  description?: string;
  transportType?: TransportType;
  userId: string;
  organizationId: string;
};

/**
 * テンプレート情報を取得または作成
 * - templateIdが指定されている場合: 既存のテンプレートから情報を取得
 * - customUrlが指定されている場合: 新しいカスタムテンプレートを作成
 */
export const getOrCreateTemplateInfo = async (
  params: GetTemplateInfoParams,
): Promise<TemplateInfo> => {
  const {
    tx,
    templateId,
    customUrl,
    name,
    description,
    transportType,
    userId,
    organizationId,
  } = params;

  // テンプレートIDまたはカスタムURLのいずれかが必要
  if (!templateId && !customUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "テンプレートIDまたはカスタムURLが必要です",
    });
  }

  // 既存テンプレートから情報を取得
  if (templateId) {
    const template = await tx.mcpServerTemplate.findUnique({
      where: { id: templateId },
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

    return {
      serverUrl: template.url,
      serverName: name ?? template.name,
      templateId,
    };
  }

  // カスタムテンプレートを作成
  if (!customUrl || !name) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "カスタムサーバーにはURLと名前が必要です",
    });
  }

  const customTemplate = await tx.mcpServerTemplate.create({
    data: {
      name,
      description: description ?? "",
      tags: [],
      iconPath: null,
      transportType: transportType ?? TransportType.SSE,
      args: [],
      url: customUrl,
      envVarKeys: [],
      authType: AuthType.OAUTH,
      oauthScopes: [],
      createdBy: userId,
      visibility: McpServerVisibility.PRIVATE,
      organizationId,
    },
  });

  return {
    serverUrl: customUrl,
    serverName: name,
    templateId: customTemplate.id,
  };
};
