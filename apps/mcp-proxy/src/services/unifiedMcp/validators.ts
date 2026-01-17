/**
 * 統合MCPサーバー用バリデーション関数
 *
 * CRUD操作で共通利用される検証ロジックを提供
 */

import { db } from "@tumiki/db/server";

/**
 * MCPサーバー存在検証の結果
 */
export type McpServerValidationResult =
  | {
      valid: true;
      servers: Array<{
        id: string;
        name: string;
        serverStatus: string;
      }>;
    }
  | {
      valid: false;
      missingIds: string[];
    };

/**
 * OAuthトークン検証の結果
 */
export type OAuthTokenValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      missingInstances: string[];
    };

/**
 * 指定されたMCPサーバーが同一組織内に存在するか検証
 *
 * @param mcpServerIds - 検証対象のMCPサーバーID配列
 * @param organizationId - 組織ID
 * @returns 検証結果（成功時はサーバー情報、失敗時は欠損ID一覧）
 */
export const validateMcpServersInOrganization = async (
  mcpServerIds: string[],
  organizationId: string,
): Promise<McpServerValidationResult> => {
  const mcpServers = await db.mcpServer.findMany({
    where: {
      id: { in: mcpServerIds },
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      serverStatus: true,
    },
  });

  if (mcpServers.length !== mcpServerIds.length) {
    const foundIds = new Set(mcpServers.map((s) => s.id));
    const missingIds = mcpServerIds.filter((id) => !foundIds.has(id));
    return { valid: false, missingIds };
  }

  return { valid: true, servers: mcpServers };
};

/**
 * ユーザーがOAuthトークンを持っているか検証
 *
 * OAuth認証が必要なテンプレートインスタンスで、
 * ユーザーのトークンが存在することを確認
 *
 * @param mcpServerIds - 検証対象のMCPサーバーID配列
 * @param userId - ユーザーID
 * @returns 検証結果（失敗時はトークンが不足しているインスタンス名一覧）
 */
export const validateOAuthTokensExist = async (
  mcpServerIds: string[],
  userId: string,
): Promise<OAuthTokenValidationResult> => {
  const templateInstances = await db.mcpServerTemplateInstance.findMany({
    where: {
      mcpServerId: { in: mcpServerIds },
    },
    include: {
      mcpServerTemplate: {
        select: {
          authType: true,
        },
      },
      oauthTokens: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  // OAuth認証が必要なインスタンスでトークンがないものをチェック
  const missingOAuthInstances = templateInstances.filter(
    (instance) =>
      instance.mcpServerTemplate.authType === "OAUTH" &&
      instance.oauthTokens.length === 0,
  );

  if (missingOAuthInstances.length > 0) {
    const missingInstances = missingOAuthInstances.map((i) => i.normalizedName);
    return { valid: false, missingInstances };
  }

  return { valid: true };
};
