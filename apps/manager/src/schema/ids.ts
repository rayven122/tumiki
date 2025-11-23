import { z } from "zod";

/**
 * NextAuth関連のID型
 */
export const AccountIdSchema = z.string().brand<"AccountId">();
export const SessionIdSchema = z.string().brand<"SessionId">();
export const UserIdSchema = z.string().brand<"UserId">();
export const VerificationTokenIdSchema = z
  .string()
  .brand<"VerificationTokenId">();

/**
 * McpServer関連のID型（新スキーマ）
 */
export const McpServerTemplateIdSchema = z
  .string()
  .brand<"McpServerTemplateId">();
export const McpServerIdSchema = z.string().brand<"McpServerId">();
export const McpConfigIdSchema = z.string().brand<"McpConfigId">();
export const McpToolIdSchema = z.string().brand<"McpToolId">();
export const McpOAuthClientIdSchema = z.string().brand<"McpOAuthClientId">();
export const McpOAuthTokenIdSchema = z.string().brand<"McpOAuthTokenId">();

/**
 * @deprecated 旧スキーマ互換性のため残存。新規実装では使用しない。
 * McpServerTemplateIdSchema を使用してください。
 */
export const OldMcpServerIdSchema = z.string().brand<"OldMcpServerId">();

/**
 * @deprecated 旧スキーマ互換性のため残存。新規実装では使用しない。
 * McpToolIdSchema を使用してください。
 */
export const ToolIdSchema = z.string().brand<"ToolId">();

/**
 * @deprecated 旧スキーマ互換性のため残存。新規実装では使用しない。
 * McpConfigIdSchema を使用してください。
 */
export const UserMcpServerConfigIdSchema = z
  .string()
  .brand<"UserMcpServerConfigId">();

/**
 * @deprecated 旧スキーマで削除されたため使用不可。
 */
export const UserToolGroupIdSchema = z.string().brand<"UserToolGroupId">();

/**
 * @deprecated 旧スキーマ互換性のため残存。新規実装では使用しない。
 * McpServerIdSchema を使用してください。
 */
export const UserMcpServerInstanceIdSchema = z
  .string()
  .brand<"UserMcpServerInstanceId">();

// 型のエクスポート
export type AccountId = z.infer<typeof AccountIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type VerificationTokenId = z.infer<typeof VerificationTokenIdSchema>;

// 新スキーマID型
export type McpServerTemplateId = z.infer<typeof McpServerTemplateIdSchema>;
export type McpServerId = z.infer<typeof McpServerIdSchema>;
export type McpConfigId = z.infer<typeof McpConfigIdSchema>;
export type McpToolId = z.infer<typeof McpToolIdSchema>;
export type McpOAuthClientId = z.infer<typeof McpOAuthClientIdSchema>;
export type McpOAuthTokenId = z.infer<typeof McpOAuthTokenIdSchema>;

// 旧スキーマID型（互換性のため残存）
/** @deprecated 新規実装では McpServerTemplateId を使用 */
export type OldMcpServerId = z.infer<typeof OldMcpServerIdSchema>;
/** @deprecated 新規実装では McpToolId を使用 */
export type ToolId = z.infer<typeof ToolIdSchema>;
/** @deprecated 新規実装では McpConfigId を使用 */
export type UserMcpServerConfigId = z.infer<typeof UserMcpServerConfigIdSchema>;
/** @deprecated ツールグループ機能は削除されました */
export type UserToolGroupId = z.infer<typeof UserToolGroupIdSchema>;
/** @deprecated 新規実装では McpServerId を使用 */
export type UserMcpServerInstanceId = z.infer<
  typeof UserMcpServerInstanceIdSchema
>;

/**
 * APIキー関連のID型
 */
export const ApiKeyIdSchema = z.string().brand<"ApiKeyId">();

export const OrganizationIdSchema = z
  .string()
  .cuid("有効な組織IDを入力してください")
  .brand<"OrganizationId">();
export const OrganizationMemberIdSchema = z
  .string()
  .brand<"OrganizationMemberId">();
export const OrganizationInvitationIdSchema = z
  .string()
  .brand<"OrganizationInvitationId">();
export const InvitationTokenSchema = z.string().brand<"InvitationToken">();
export const OrganizationGroupIdSchema = z
  .string()
  .brand<"OrganizationGroupId">();
export const OrganizationRoleIdSchema = z
  .string()
  .brand<"OrganizationRoleId">();
export const RolePermissionIdSchema = z.string().brand<"RolePermissionId">();
export const ResourceAccessControlIdSchema = z
  .string()
  .brand<"ResourceAccessControlId">();

export type OrganizationId = z.infer<typeof OrganizationIdSchema>;
export type OrganizationMemberId = z.infer<typeof OrganizationMemberIdSchema>;
export type OrganizationInvitationId = z.infer<
  typeof OrganizationInvitationIdSchema
>;
export type InvitationToken = z.infer<typeof InvitationTokenSchema>;
export type OrganizationGroupId = z.infer<typeof OrganizationGroupIdSchema>;
export type OrganizationRoleId = z.infer<typeof OrganizationRoleIdSchema>;
export type RolePermissionId = z.infer<typeof RolePermissionIdSchema>;
export type ResourceAccessControlId = z.infer<
  typeof ResourceAccessControlIdSchema
>;
export type ApiKeyId = z.infer<typeof ApiKeyIdSchema>;
