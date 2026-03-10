/**
 * ツール入力スキーマ（MCP SDK 互換）
 */
type ToolInputSchema = {
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
  [key: string]: unknown;
};

/**
 * ツール定義（ドメインモデル）
 */
type ToolDefinition = {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: ToolInputSchema;
};

export type { ToolInputSchema, ToolDefinition };
