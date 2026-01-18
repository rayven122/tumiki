/**
 * 統合MCPサーバーのレスポンスマッピング関数
 *
 * Prismaモデルから API レスポンス形式への変換を行う
 */

import type { UnifiedMcpServerResponse } from "./types.js";

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
  templateInstances: Array<{
    id: string;
    normalizedName: string;
    displayOrder: number;
    isEnabled: boolean;
    mcpServerTemplate: {
      id: string;
      name: string;
    };
  }>;
};

/**
 * 統合MCPサーバーをAPIレスポンス形式にマッピング
 *
 * @param server - Prismaから取得した統合サーバーデータ
 * @returns APIレスポンス形式の統合サーバーデータ
 */
export const mapToUnifiedMcpServerResponse = (
  server: UnifiedServerWithTemplateInstances,
): UnifiedMcpServerResponse => {
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    organizationId: server.organizationId,
    templateInstances: server.templateInstances.map((instance) => ({
      id: instance.id,
      normalizedName: instance.normalizedName,
      templateName: instance.mcpServerTemplate.name,
      templateId: instance.mcpServerTemplate.id,
      displayOrder: instance.displayOrder,
      isEnabled: instance.isEnabled,
    })),
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
  };
};

/**
 * 統合MCPサーバー一覧をAPIレスポンス形式にマッピング
 *
 * @param servers - Prismaから取得した統合サーバー一覧
 * @returns APIレスポンス形式の統合サーバー一覧
 */
export const mapToUnifiedMcpServerListResponse = (
  servers: UnifiedServerWithTemplateInstances[],
): UnifiedMcpServerResponse[] =>
  servers.map((server) => mapToUnifiedMcpServerResponse(server));
