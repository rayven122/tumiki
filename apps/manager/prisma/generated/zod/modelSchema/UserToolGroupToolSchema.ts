import { z } from 'zod';

/////////////////////////////////////////
// USER TOOL GROUP TOOL SCHEMA
/////////////////////////////////////////

/**
 * ToolGroup, Toolの関連を表す中間テーブル
 * @namespace McpServer
 * @namespace UserMcpServer
 */
export const UserToolGroupToolSchema = z.object({
  /**
   * UserMcpServerConfig への参照
   */
  userMcpServerConfigId: z.string(),
  /**
   * ToolGroupへの参照
   */
  toolGroupId: z.string(),
  /**
   * Toolへの参照
   */
  toolId: z.string(),
  /**
   * ソート順序
   */
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
})

export type UserToolGroupTool = z.infer<typeof UserToolGroupToolSchema>

/////////////////////////////////////////
// USER TOOL GROUP TOOL OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserToolGroupToolOptionalDefaultsSchema = UserToolGroupToolSchema.merge(z.object({
  /**
   * ソート順序
   */
  sortOrder: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
}))

export type UserToolGroupToolOptionalDefaults = z.infer<typeof UserToolGroupToolOptionalDefaultsSchema>

export default UserToolGroupToolSchema;
