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
 * McpServer関連のID型
 */
export const McpServerIdSchema = z.string().brand<"McpServerId">();
export const ToolIdSchema = z.string().brand<"ToolId">();

/**
 * UserMcpServer関連のID型
 */
export const UserMcpServerConfigIdSchema = z
  .string()
  .brand<"UserMcpServerConfigId">();
export const UserToolGroupIdSchema = z.string().brand<"UserToolGroupId">();
export const UserMcpServerInstanceIdSchema = z
  .string()
  .brand<"UserMcpServerInstanceId">();

// 型のエクスポート
export type AccountId = z.infer<typeof AccountIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type VerificationTokenId = z.infer<typeof VerificationTokenIdSchema>;

export type McpServerId = z.infer<typeof McpServerIdSchema>;
export type ToolId = z.infer<typeof ToolIdSchema>;

export type UserMcpServerConfigId = z.infer<typeof UserMcpServerConfigIdSchema>;
export type UserToolGroupId = z.infer<typeof UserToolGroupIdSchema>;
export type UserMcpServerInstanceId = z.infer<
  typeof UserMcpServerInstanceIdSchema
>;

export const OrganizationIdSchema = z
  .string()
  .uuid("有効な組織IDを入力してください")
  .brand<"OrganizationId">();
export const OrganizationMemberIdSchema = z
  .string()
  .brand<"OrganizationMemberId">();
export const OrganizationInvitationIdSchema = z
  .string()
  .brand<"OrganizationInvitationId">();
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
export type OrganizationGroupId = z.infer<typeof OrganizationGroupIdSchema>;
export type OrganizationRoleId = z.infer<typeof OrganizationRoleIdSchema>;
export type RolePermissionId = z.infer<typeof RolePermissionIdSchema>;
export type ResourceAccessControlId = z.infer<
  typeof ResourceAccessControlIdSchema
>;
