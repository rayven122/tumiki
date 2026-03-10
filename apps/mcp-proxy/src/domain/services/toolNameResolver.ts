/**
 * ツール名解決サービス
 *
 * テンプレートインスタンスからツール情報を変換する純粋関数群
 */

import type { ToolDefinition, ToolInputSchema } from "../types/tool.js";

/**
 * データベースの inputSchema を MCP SDK の Tool["inputSchema"] 形式に変換
 *
 * MCP SDK では inputSchema.type が "object" リテラルであることが必須
 */
export const toToolInputSchema = (inputSchema: unknown): ToolInputSchema => {
  const schema = inputSchema as Record<string, unknown>;
  return {
    type: "object",
    properties: schema.properties as Record<string, object> | undefined,
    required: schema.required as string[] | undefined,
    ...schema,
  };
};

/**
 * テンプレートインスタンスの許可ツール情報
 */
type TemplateInstanceTools = {
  normalizedName: string;
  allowedTools: Array<{
    name: string;
    description: string | null;
    inputSchema: unknown;
  }>;
};

/**
 * テンプレートインスタンスからツール情報を変換
 *
 * @param templateInstances - テンプレートインスタンス配列
 * @returns ツール情報配列（"{normalizedName}__{ツール名}" 形式）
 */
export const transformTemplateInstancesToTools = (
  templateInstances: TemplateInstanceTools[],
): ToolDefinition[] => {
  return templateInstances.flatMap((instance) =>
    instance.allowedTools.map((tool) => ({
      name: `${instance.normalizedName}__${tool.name}`,
      // MCP SDK では description は undefined（null ではない）
      description: tool.description ?? undefined,
      inputSchema: toToolInputSchema(tool.inputSchema),
    })),
  );
};
