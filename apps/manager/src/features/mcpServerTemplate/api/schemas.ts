/**
 * MCPサーバーテンプレート API スキーマ定義
 */
import { z } from "zod";
import { TransportType, AuthType, McpServerVisibility } from "@tumiki/db";

/**
 * 一覧取得 Input スキーマ
 */
export const listMcpServerTemplatesInputSchema = z.object({
  transportType: z.nativeEnum(TransportType).optional(),
  authType: z.nativeEnum(AuthType).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type ListMcpServerTemplatesInput = z.infer<
  typeof listMcpServerTemplatesInputSchema
>;

/**
 * 一覧取得 Output スキーマ
 */
export const listMcpServerTemplatesOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    normalizedName: z.string(),
    description: z.string().nullable(),
    tags: z.array(z.string()),
    iconPath: z.string().nullable(),
    transportType: z.nativeEnum(TransportType),
    command: z.string().nullable(),
    args: z.array(z.string()),
    url: z.string().nullable(),
    envVarKeys: z.array(z.string()),
    authType: z.nativeEnum(AuthType),
    oauthProvider: z.string().nullable(),
    oauthScopes: z.array(z.string()),
    useCloudRunIam: z.boolean(),
    createdBy: z.string().nullable(),
    visibility: z.nativeEnum(McpServerVisibility),
    organizationId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export type ListMcpServerTemplatesOutput = z.infer<
  typeof listMcpServerTemplatesOutputSchema
>;

/**
 * 詳細取得 Input スキーマ
 */
export const getMcpServerTemplateInputSchema = z.object({
  id: z.string(),
});

export type GetMcpServerTemplateInput = z.infer<
  typeof getMcpServerTemplateInputSchema
>;

/**
 * 共通テンプレート Output スキーマ（詳細取得、作成、更新で共用）
 */
const mcpServerTemplateOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  normalizedName: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  iconPath: z.string().nullable(),
  transportType: z.nativeEnum(TransportType),
  command: z.string().nullable(),
  args: z.array(z.string()),
  url: z.string().nullable(),
  envVarKeys: z.array(z.string()),
  authType: z.nativeEnum(AuthType),
  oauthProvider: z.string().nullable(),
  oauthScopes: z.array(z.string()),
  useCloudRunIam: z.boolean(),
  createdBy: z.string().nullable(),
  visibility: z.nativeEnum(McpServerVisibility),
  organizationId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * 詳細取得 Output スキーマ
 */
export const getMcpServerTemplateOutputSchema = mcpServerTemplateOutputSchema;

export type GetMcpServerTemplateOutput = z.infer<
  typeof getMcpServerTemplateOutputSchema
>;

/**
 * 作成 Input スキーマ
 */
export const createMcpServerTemplateInputSchema = z
  .object({
    name: z.string().min(1, "名前は必須です"),
    normalizedName: z.string().min(1, "正規化名は必須です"),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    iconPath: z.string().optional(),
    transportType: z.nativeEnum(TransportType),
    command: z.string().optional(),
    args: z.array(z.string()).default([]),
    url: z.string().optional(),
    envVarKeys: z.array(z.string()).default([]),
    authType: z.nativeEnum(AuthType).default(AuthType.NONE),
    oauthProvider: z.string().optional(),
    oauthScopes: z.array(z.string()).default([]),
    useCloudRunIam: z.boolean().default(false),
    visibility: z
      .nativeEnum(McpServerVisibility)
      .default(McpServerVisibility.PRIVATE),
  })
  .refine(
    (data) => {
      // STDIO: command必須
      if (data.transportType === TransportType.STDIO) {
        return !!data.command;
      }
      // SSE/HTTPS: url必須
      if (
        data.transportType === TransportType.SSE ||
        data.transportType === TransportType.STREAMABLE_HTTPS
      ) {
        return !!data.url;
      }
      return true;
    },
    {
      message: "STDIO接続にはcommandが、SSE/HTTPS接続にはurlが必須です",
      path: ["command"],
    },
  )
  .refine(
    (data) => {
      // コマンドホワイトリスト: npx, node, python, python3のみ
      const allowedCommands = ["npx", "node", "python", "python3"];
      if (data.command) {
        return allowedCommands.includes(data.command);
      }
      return true;
    },
    {
      message:
        "許可されていないコマンドです（npx, node, python, python3のみ使用可能）",
      path: ["command"],
    },
  );

export type CreateMcpServerTemplateInput = z.infer<
  typeof createMcpServerTemplateInputSchema
>;

/**
 * 作成 Output スキーマ
 */
export const createMcpServerTemplateOutputSchema =
  mcpServerTemplateOutputSchema;

export type CreateMcpServerTemplateOutput = z.infer<
  typeof createMcpServerTemplateOutputSchema
>;

/**
 * 更新 Input スキーマ
 */
export const updateMcpServerTemplateInputSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, "名前は必須です").optional(),
    normalizedName: z.string().min(1, "正規化名は必須です").optional(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    iconPath: z.string().nullable().optional(),
    transportType: z.nativeEnum(TransportType).optional(),
    command: z.string().nullable().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().nullable().optional(),
    envVarKeys: z.array(z.string()).optional(),
    authType: z.nativeEnum(AuthType).optional(),
    oauthProvider: z.string().nullable().optional(),
    oauthScopes: z.array(z.string()).optional(),
    useCloudRunIam: z.boolean().optional(),
    visibility: z.nativeEnum(McpServerVisibility).optional(),
  })
  .refine(
    (data) => {
      // コマンドホワイトリスト: npx, node, python, python3のみ
      const allowedCommands = ["npx", "node", "python", "python3"];
      if (data.command) {
        return allowedCommands.includes(data.command);
      }
      return true;
    },
    {
      message:
        "許可されていないコマンドです（npx, node, python, python3のみ使用可能）",
      path: ["command"],
    },
  );

export type UpdateMcpServerTemplateInput = z.infer<
  typeof updateMcpServerTemplateInputSchema
>;

/**
 * 更新 Output スキーマ
 */
export const updateMcpServerTemplateOutputSchema =
  mcpServerTemplateOutputSchema;

export type UpdateMcpServerTemplateOutput = z.infer<
  typeof updateMcpServerTemplateOutputSchema
>;

/**
 * 削除 Input スキーマ
 */
export const deleteMcpServerTemplateInputSchema = z.object({
  id: z.string(),
});

export type DeleteMcpServerTemplateInput = z.infer<
  typeof deleteMcpServerTemplateInputSchema
>;

/**
 * 削除 Output スキーマ
 */
export const deleteMcpServerTemplateOutputSchema = z.object({
  success: z.boolean(),
});

export type DeleteMcpServerTemplateOutput = z.infer<
  typeof deleteMcpServerTemplateOutputSchema
>;
