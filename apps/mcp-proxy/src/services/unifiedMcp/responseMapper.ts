/**
 * 統合MCPサーバーのレスポンスマッピング関数
 *
 * Prismaモデルから API レスポンス形式への変換を行う
 */

import type { UnifiedMcpServerResponse } from "./types.js";

/** テンプレートインスタンスのDB結果型 */
type TemplateInstanceData = {
  id: string;
  normalizedName: string;
  displayOrder: number;
  isEnabled: boolean;
  mcpServerTemplate: {
    id: string;
    name: string;
  };
};

/**
 * Prisma から取得した統合MCPサーバーデータの型
 *
 * serverType = UNIFIED の McpServer と templateInstances を組み合わせた形式
 */
export type UnifiedServerWithTemplateInstances = {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  templateInstances: TemplateInstanceData[];
};

/**
 * テンプレートインスタンスをレスポンス形式にマッピング
 */
const mapTemplateInstance = (instance: TemplateInstanceData) => ({
  id: instance.id,
  normalizedName: instance.normalizedName,
  templateName: instance.mcpServerTemplate.name,
  templateId: instance.mcpServerTemplate.id,
  displayOrder: instance.displayOrder,
  isEnabled: instance.isEnabled,
});

/**
 * 統合MCPサーバーをAPIレスポンス形式にマッピング
 */
export const mapToUnifiedMcpServerResponse = (
  server: UnifiedServerWithTemplateInstances,
): UnifiedMcpServerResponse => ({
  id: server.id,
  name: server.name,
  description: server.description,
  organizationId: server.organizationId,
  templateInstances: server.templateInstances.map(mapTemplateInstance),
  createdAt: server.createdAt.toISOString(),
  updatedAt: server.updatedAt.toISOString(),
});

/**
 * 統合MCPサーバー一覧をAPIレスポンス形式にマッピング
 */
export const mapToUnifiedMcpServerListResponse = (
  servers: UnifiedServerWithTemplateInstances[],
): UnifiedMcpServerResponse[] => servers.map(mapToUnifiedMcpServerResponse);
