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
 * ApiAccess関連のID型
 */
export const UserMcpServerIdSchema = z.string().brand<"UserMcpServerId">();
export const ToolGroupIdSchema = z.string().brand<"ToolGroupId">();
export const ApiKeyIdSchema = z.string().brand<"ApiKeyId">();

// 型のエクスポート
export type AccountId = z.infer<typeof AccountIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type VerificationTokenId = z.infer<typeof VerificationTokenIdSchema>;

export type McpServerId = z.infer<typeof McpServerIdSchema>;
export type ToolId = z.infer<typeof ToolIdSchema>;

export type UserMcpServerId = z.infer<typeof UserMcpServerIdSchema>;
export type ToolGroupId = z.infer<typeof ToolGroupIdSchema>;
export type ApiKeyId = z.infer<typeof ApiKeyIdSchema>;
