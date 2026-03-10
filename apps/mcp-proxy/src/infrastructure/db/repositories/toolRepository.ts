/**
 * ツールリポジトリ
 *
 * ツール関連のDBクエリを提供。
 * callToolCommand / listToolsQuery から使用される。
 */

import { db } from "@tumiki/db/server";

/**
 * テンプレートインスタンスとテンプレート情報を複合キーで取得
 *
 * 無効化されたテンプレートインスタンスは取得できない（NotFoundエラーとなる）
 *
 * @param mcpServerId - McpServer ID
 * @param normalizedName - インスタンスの正規化名
 * @returns テンプレートインスタンス（テンプレート・ツール・サーバー情報含む）
 * @throws NotFoundError - インスタンスが見つからない、または無効化されている場合
 */
export const getTemplateInstanceWithTemplate = async (
  mcpServerId: string,
  normalizedName: string,
) => {
  const instance = await db.mcpServerTemplateInstance.findUniqueOrThrow({
    where: {
      mcpServerId_normalizedName: { mcpServerId, normalizedName },
    },
    include: {
      mcpServer: {
        select: {
          organizationId: true,
        },
      },
      mcpServerTemplate: {
        include: {
          mcpTools: true,
        },
      },
    },
  });

  // 無効化されたインスタンスはツール実行不可
  if (!instance.isEnabled) {
    throw new Error(
      `Template instance "${normalizedName}" is disabled and cannot be used`,
    );
  }

  return instance;
};

/**
 * ユーザーのMcpConfigを取得
 *
 * @param templateInstanceId - McpServerTemplateInstance ID
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns McpConfig（見つからない場合はnull）
 */
export const getMcpConfigForUser = async (
  templateInstanceId: string,
  organizationId: string,
  userId: string,
) => {
  return db.mcpConfig.findUnique({
    where: {
      mcpServerTemplateInstanceId_userId_organizationId: {
        mcpServerTemplateInstanceId: templateInstanceId,
        organizationId,
        userId,
      },
    },
    select: {
      id: true,
      envVars: true,
      mcpServerTemplateInstanceId: true,
      organizationId: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * テンプレートインスタンスのツール情報の型
 */
type TemplateInstanceToolsSelect = {
  normalizedName: string;
  allowedTools: Array<{
    name: string;
    description: string | null;
    inputSchema: unknown;
  }>;
};

/**
 * ツール一覧とdynamicSearchフラグを取得
 *
 * @param mcpServerId - McpServer ID
 * @returns dynamicSearchフラグとテンプレートインスタンスのツール情報（見つからない場合はnull）
 */
export const getToolsWithDynamicSearchFlag = async (
  mcpServerId: string,
): Promise<{
  dynamicSearch: boolean;
  templateInstances: TemplateInstanceToolsSelect[];
} | null> => {
  return db.mcpServer.findUnique({
    where: { id: mcpServerId },
    select: {
      dynamicSearch: true,
      templateInstances: {
        where: { isEnabled: true },
        select: {
          normalizedName: true,
          allowedTools: {
            select: {
              name: true,
              description: true,
              inputSchema: true,
            },
          },
        },
      },
    },
  });
};

/**
 * テンプレートインスタンスのツール一覧を取得（dynamicSearchフラグ無視）
 *
 * Dynamic Search 用の内部ツール取得に使用
 *
 * @param mcpServerId - McpServer ID
 * @returns テンプレートインスタンスのツール情報（見つからない場合はnull）
 */
export const getTemplateInstanceTools = async (
  mcpServerId: string,
): Promise<{
  templateInstances: TemplateInstanceToolsSelect[];
} | null> => {
  return db.mcpServer.findUnique({
    where: { id: mcpServerId },
    select: {
      templateInstances: {
        where: { isEnabled: true },
        select: {
          normalizedName: true,
          allowedTools: {
            select: {
              name: true,
              description: true,
              inputSchema: true,
            },
          },
        },
      },
    },
  });
};
