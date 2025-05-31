import { z } from 'zod';

/////////////////////////////////////////
// USER MCP SERVER CONFIG SCHEMA
/////////////////////////////////////////

/**
 * ユーザーが利用できるMCPサーバーの設定
 * @namespace McpServer
 * @namespace UserMcpServer
 */
export const UserMcpServerConfigSchema = z.object({
  id: z.string().cuid(),
  /**
   * 設定名（例：「開発用」「本番用」「テスト用」）
   */
  name: z.string(),
  /**
   * 設定の説明
   */
  description: z.string(),
  /**
   * MCPサーバーの envVars を文字配列を key にしたオブジェクトを Object.stringify + 暗号化したもの
   * @encrypted
   */
  envVars: z.string(),
  /**
   * MCPサーバーID
   */
  mcpServerId: z.string(),
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

export type UserMcpServerConfig = z.infer<typeof UserMcpServerConfigSchema>

/////////////////////////////////////////
// USER MCP SERVER CONFIG OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserMcpServerConfigOptionalDefaultsSchema = UserMcpServerConfigSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type UserMcpServerConfigOptionalDefaults = z.infer<typeof UserMcpServerConfigOptionalDefaultsSchema>

export default UserMcpServerConfigSchema;
