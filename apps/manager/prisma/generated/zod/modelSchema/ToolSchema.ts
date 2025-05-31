import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'

/////////////////////////////////////////
// TOOL SCHEMA
/////////////////////////////////////////

/**
 * MCP サーバーのツール一覧
 * @namespace McpServer
 */
export const ToolSchema = z.object({
  id: z.string().cuid(),
  /**
   * ツールの名前
   */
  name: z.string().min(1),
  /**
   * ツールの説明
   */
  description: z.string(),
  /**
   * ツールの入力スキーマ（JSON Schema形式）
   */
  inputSchema: JsonValueSchema,
  /**
   * ツールを有効にするか
   */
  isEnabled: z.boolean(),
  mcpServerId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Tool = z.infer<typeof ToolSchema>

/////////////////////////////////////////
// TOOL OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const ToolOptionalDefaultsSchema = ToolSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * ツールを有効にするか
   */
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type ToolOptionalDefaults = z.infer<typeof ToolOptionalDefaultsSchema>

export default ToolSchema;
