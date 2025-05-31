import { z } from 'zod';

/////////////////////////////////////////
// USER MCP SERVER INSTANCE TOOL GROUP SCHEMA
/////////////////////////////////////////

/**
 * MCPサーバーインスタンスとツールグループの関連を管理する中間テーブル
 * @namespace UserMcpServer
 * @namespace McpServer
 */
export const UserMcpServerInstanceToolGroupSchema = z.object({
  mcpServerInstanceId: z.string(),
  toolGroupId: z.string(),
  /**
   * このMcpServerInstance内でのToolGroupの表示順序
   */
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
})

export type UserMcpServerInstanceToolGroup = z.infer<typeof UserMcpServerInstanceToolGroupSchema>

/////////////////////////////////////////
// USER MCP SERVER INSTANCE TOOL GROUP OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserMcpServerInstanceToolGroupOptionalDefaultsSchema = UserMcpServerInstanceToolGroupSchema.merge(z.object({
  /**
   * このMcpServerInstance内でのToolGroupの表示順序
   */
  sortOrder: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
}))

export type UserMcpServerInstanceToolGroupOptionalDefaults = z.infer<typeof UserMcpServerInstanceToolGroupOptionalDefaultsSchema>

export default UserMcpServerInstanceToolGroupSchema;
