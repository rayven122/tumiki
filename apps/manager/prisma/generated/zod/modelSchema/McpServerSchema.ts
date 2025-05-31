import { z } from 'zod';

/////////////////////////////////////////
// MCP SERVER SCHEMA
/////////////////////////////////////////

/**
 * MCP サーバー (github や notion などの接続する外部 MCP サーバー)
 * @namespace McpServer
 */
export const McpServerSchema = z.object({
  id: z.string().cuid(),
  /**
   * MCP サーバー名
   */
  name: z.string().min(1),
  /**
   * アイコンパス
   */
  iconPath: z.string().nullable(),
  /**
   * コマンド
   */
  command: z.string().min(1),
  /**
   * 引数
   */
  args: z.string().min(1).array(),
  /**
   * 環境変数
   */
  envVars: z.string().array(),
  /**
   * サーバーが公開されているか
   */
  isPublic: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type McpServer = z.infer<typeof McpServerSchema>

/////////////////////////////////////////
// MCP SERVER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const McpServerOptionalDefaultsSchema = McpServerSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * サーバーが公開されているか
   */
  isPublic: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type McpServerOptionalDefaults = z.infer<typeof McpServerOptionalDefaultsSchema>

export default McpServerSchema;
