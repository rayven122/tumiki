/**
 * MCPサーバーテンプレート関連のヘルパー関数
 */
import type { PrismaTransactionClient } from "@tumiki/db";
import { Prisma } from "@tumiki/db/prisma";
import {
  AuthType,
  TransportType,
  McpServerVisibility,
} from "@tumiki/db/server";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";
import { TRPCError } from "@trpc/server";

type TemplateInfo = {
  serverUrl: string;
  serverName: string;
  templateId: string;
  iconPath: string | null;
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
      iconPath: template.iconPath,
    };
  }

  // カスタムテンプレートを作成
  if (!customUrl || !name) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "カスタムサーバーにはURLと名前が必要です",
    });
  }

  try {
    const customTemplate = await tx.mcpServerTemplate.create({
      data: {
        name,
        normalizedName: normalizeServerName(name),
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
      iconPath: null,
    };
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
};
