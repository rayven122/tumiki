import { z } from 'zod';

/////////////////////////////////////////
// USER TOOL GROUP SCHEMA
/////////////////////////////////////////

/**
 * どのツール群を利用するかを設定する
 * tool group 内に、同一の mcpServer の設定入れられない🤔
 * @namespace McpServer
 * @namespace UserMcpServer
 */
export const UserToolGroupSchema = z.object({
  id: z.string().cuid(),
  /**
   * ツールグループ名
   */
  name: z.string().min(1),
  /**
   * ツールグループの説明
   */
  description: z.string(),
  /**
   * ツールグループが有効かどうか
   */
  isEnabled: z.boolean(),
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

export type UserToolGroup = z.infer<typeof UserToolGroupSchema>

/////////////////////////////////////////
// USER TOOL GROUP OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserToolGroupOptionalDefaultsSchema = UserToolGroupSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * ツールグループが有効かどうか
   */
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type UserToolGroupOptionalDefaults = z.infer<typeof UserToolGroupOptionalDefaultsSchema>

export default UserToolGroupSchema;
