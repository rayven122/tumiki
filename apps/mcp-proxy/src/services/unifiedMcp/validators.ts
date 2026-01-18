/**
 * 統合MCPサーバー用バリデーション関数
 *
 * CRUD操作で共通利用される検証ロジックを提供
 */

import { db } from "@tumiki/db/server";
import type { CreateTemplateInstanceRequest } from "./types.js";

/** テンプレート情報 */
type TemplateInfo = {
  id: string;
  name: string;
  authType: string;
};

/** テンプレート存在検証の結果 */
export type TemplateValidationResult =
  | { valid: true; templates: TemplateInfo[] }
  | { valid: false; missingIds: string[] };

/** OAuthトークン検証の結果 */
export type OAuthTokenValidationResult =
  | { valid: true }
  | { valid: false; missingTemplateNames: string[] };

/**
 * 欠損IDを抽出
 */
const findMissingIds = (
  requestedIds: string[],
  foundIds: Set<string>,
): string[] => requestedIds.filter((id) => !foundIds.has(id));

/**
 * OAuth認証が必要でトークンがないテンプレートを抽出
 */
const findTemplatesMissingOAuthTokens = (
  templates: Array<{
    name: string;
    authType: string;
    oauthClients: Array<{ oauthTokens: Array<{ id: string }> }>;
  }>,
): string[] =>
  templates
    .filter(
      (template) =>
        template.authType === "OAUTH" &&
        (template.oauthClients.length === 0 ||
          template.oauthClients.every(
            (client) => client.oauthTokens.length === 0,
          )),
    )
    .map((t) => t.name);

/**
 * 指定されたテンプレートが同一組織内に存在するか検証
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
    const missingIds = findMissingIds(templateIds, foundIds);
    return { valid: false, missingIds };
  }

  return { valid: true, templates: foundTemplates };
};

/**
 * ユーザーがOAuthトークンを持っているか検証
 *
 * OAuth認証が必要なテンプレートで、ユーザーのトークンが存在することを確認
 */
export const validateOAuthTokensExist = async (
  templates: CreateTemplateInstanceRequest[],
  userId: string,
  organizationId: string,
): Promise<OAuthTokenValidationResult> => {
  const templateIds = templates.map((t) => t.templateId);

  // テンプレート情報とOAuthクライアント・トークンを取得
  const templateData = await db.mcpServerTemplate.findMany({
    where: { id: { in: templateIds } },
    select: {
      id: true,
      name: true,
      authType: true,
      oauthClients: {
        where: { organizationId },
        select: {
          id: true,
          oauthTokens: {
            where: { userId },
            select: { id: true },
          },
        },
      },
    },
  });

  const missingTemplateNames = findTemplatesMissingOAuthTokens(templateData);

  if (missingTemplateNames.length > 0) {
    return { valid: false, missingTemplateNames };
  }

  return { valid: true };
};
