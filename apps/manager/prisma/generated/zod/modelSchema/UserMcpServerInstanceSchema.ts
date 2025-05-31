import { z } from 'zod';
import { ServerStatusSchema } from '../inputTypeSchemas/ServerStatusSchema'
import { ServerTypeSchema } from '../inputTypeSchemas/ServerTypeSchema'

/////////////////////////////////////////
// USER MCP SERVER INSTANCE SCHEMA
/////////////////////////////////////////

/**
 * MCPサーバーとして利用するインスタンス
 * @namespace McpServer
 * @namespace UserMcpServer
 */
export const UserMcpServerInstanceSchema = z.object({
  /**
   * サーバーの状態
   */
  serverStatus: ServerStatusSchema,
  /**
   * サーバーの種類
   */
  serverType: ServerTypeSchema,
  id: z.string().cuid(),
  /**
   * 稼働中のMCPサーバー名
   */
  name: z.string().min(1),
  /**
   * サーバーの説明
   */
  description: z.string(),
  /**
   * アイコンパス
   */
  iconPath: z.string().nullable(),
  /**
   * ツールグループ
   * UserMcpServerInstance ごとに1つの ToolGroup が存在する 1:1 関係
   */
  toolGroupId: z.string(),
  /**
   * ユーザーID
   */
  userId: z.string(),
  /**
   * 組織
   */
  organizationId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserMcpServerInstance = z.infer<typeof UserMcpServerInstanceSchema>

/////////////////////////////////////////
// USER MCP SERVER INSTANCE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserMcpServerInstanceOptionalDefaultsSchema = UserMcpServerInstanceSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type UserMcpServerInstanceOptionalDefaults = z.infer<typeof UserMcpServerInstanceOptionalDefaultsSchema>

export default UserMcpServerInstanceSchema;
