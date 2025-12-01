import { z } from "zod";

import { type getTenantContext } from "../../context/tenantContext.js";

/**
 * organizationId フィールドを持つモデルのリスト
 * これらのモデルに対して自動的にテナントフィルタリングを適用
 */
const TENANT_SCOPED_MODELS = [
  "Organization",
  "OrganizationMember",
  "OrganizationGroup",
  "OrganizationRole",
  "OrganizationInvitation",
  "ResourceAccessControl",
  "McpConfig",
  "McpServer",
  "McpServerRequestLog",
  "McpApiKey",
  "McpOAuthToken",
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

// テナントコンテキストのスキーマ定義
const TenantContextSchema = z.object({
  organizationId: z.string(),
  bypassRLS: z.boolean().optional(),
  userId: z.string().optional(),
  debug: z.boolean().optional(),
});

/**
 * モデルがテナントスコープを持つかチェック
 */
export const isTenantScopedModel = (
  model: string,
): model is TenantScopedModel => {
  return TENANT_SCOPED_MODELS.includes(model as TenantScopedModel);
};

/**
 * organizationId フィルタ検証
 */
export const validateOrganizationContext = (
  context: ReturnType<typeof getTenantContext>,
  model: string,
  operation: string,
): void => {
  const result = TenantContextSchema.safeParse(context);

  if (!result.success) {
    console.error(`Missing organization context for ${model}.${operation}`);
    throw new Error("組織コンテキストが設定されていません");
  }
};
