import { z } from "zod";

export const cloudMcpToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // MCP ツールの JSON Schema オブジェクト。任意のキーを受け付けるためレコード型で定義する
  inputSchema: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const cloudMcpTemplateInstanceSchema = z.object({
  id: z.string(),
  normalizedName: z.string(),
  isEnabled: z.boolean(),
  // cloud は STREAMABLE_HTTPS、desktop は STREAMABLE_HTTP と命名が異なるため
  // toDesktopTransportType で変換する。cloud 側に新しい transport が追加された場合は
  // この enum と変換ロジックの両方を更新すること
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTPS"]),
  command: z.string().nullable(),
  args: z.array(z.string()),
  url: z.string().nullable(),
  authType: z.enum(["NONE", "API_KEY", "OAUTH"]),
  tools: z.array(cloudMcpToolSchema),
});

export const cloudMcpServerSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().nullable(),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
    execute: z.boolean(),
  }),
  templateInstances: z.array(cloudMcpTemplateInstanceSchema),
});

export const mcpConfigsResponseSchema = z.object({
  mcpServers: z.array(cloudMcpServerSchema),
});

export type CloudMcpServer = z.infer<typeof cloudMcpServerSchema>;
export type CloudMcpTemplateInstance = z.infer<
  typeof cloudMcpTemplateInstanceSchema
>;
export type McpConfigsResponse = z.infer<typeof mcpConfigsResponseSchema>;

export type McpPolicySyncResult = {
  created: number;
  updated: number;
  /** Best-effort 同期でスキップ（個別エラー）した件数。renderer 側で通知に利用する */
  failed: number;
};
