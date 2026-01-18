/**
 * 統合MCPサーバー用バリデーション関数
 *
 * CRUD操作で共通利用される検証ロジックを提供
 */

import { db } from "@tumiki/db/server";
import type { CreateTemplateInstanceRequest } from "./types.js";

/**
 * テンプレート存在検証の結果
 */
export type TemplateValidationResult =
  | {
      valid: true;
      templates: Array<{
        id: string;
        name: string;
        authType: string;
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
      missingTemplateNames: string[];
    };

/**
 * 指定されたテンプレートが同一組織内に存在するか検証
 *
 * @param templates - 検証対象のテンプレート配列
 * @param organizationId - 組織ID
 * @returns 検証結果（成功時はテンプレート情報、失敗時は欠損ID一覧）
 */
export const validateTemplatesInOrganization = async (
  templates: CreateTemplateInstanceRequest[],
  organizationId: string,
): Promise<TemplateValidationResult> => {
  const templateIds = templates.map((t) => t.templateId);

  const foundTemplates = await db.mcpServerTemplate.findMany({
    where: {
      id: { in: templateIds },
      organizationId,
    },
    select: {
      id: true,
      name: true,
      authType: true,
    },
  });

  if (foundTemplates.length !== templateIds.length) {
    const foundIds = new Set(foundTemplates.map((t) => t.id));
    const missingIds = templateIds.filter((id) => !foundIds.has(id));
    return { valid: false, missingIds };
  }

  return { valid: true, templates: foundTemplates };
};

/**
 * ユーザーがOAuthトークンを持っているか検証
 *
 * OAuth認証が必要なテンプレートで、
 * ユーザーのトークンが存在することを確認
 *
 * @param templates - 検証対象のテンプレート配列
 * @param userId - ユーザーID
 * @param organizationId - 組織ID
 * @returns 検証結果（失敗時はトークンが不足しているテンプレート名一覧）
 */
export const validateOAuthTokensExist = async (
  templates: CreateTemplateInstanceRequest[],
  userId: string,
  organizationId: string,
): Promise<OAuthTokenValidationResult> => {
  const templateIds = templates.map((t) => t.templateId);

  // テンプレート情報とOAuthクライアント・トークンを取得
  const templateData = await db.mcpServerTemplate.findMany({
    where: {
      id: { in: templateIds },
    },
    select: {
      id: true,
      name: true,
      authType: true,
      oauthClients: {
        where: {
          organizationId,
        },
        select: {
          id: true,
          oauthTokens: {
            where: {
              userId,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  // OAuth認証が必要なテンプレートでトークンがないものをチェック
  const missingOAuthTemplates = templateData.filter(
    (template) =>
      template.authType === "OAUTH" &&
      (template.oauthClients.length === 0 ||
        template.oauthClients.every(
          (client) => client.oauthTokens.length === 0,
        )),
  );

  if (missingOAuthTemplates.length > 0) {
    const missingTemplateNames = missingOAuthTemplates.map((t) => t.name);
    return { valid: false, missingTemplateNames };
  }

  return { valid: true };
};
