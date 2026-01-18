/**
 * 統合MCPサーバーのレスポンスマッピング関数
 *
 * Prismaモデルから API レスポンス形式への変換を行う
 */

import type { ServerStatus } from "@tumiki/db";
import type { UnifiedMcpServerResponse } from "./types.js";

/**
 * Prisma から取得した統合MCPサーバーデータの型
 *
 * serverType = UNIFIED の McpServer と McpServerChild を組み合わせた形式
 */
export type UnifiedServerWithChildren = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: string; // UNIFIED では必須
  createdAt: Date;
  updatedAt: Date;
  childServers: Array<{
    childMcpServer: {
      id: string;
      name: string;
      serverStatus: ServerStatus;
      deletedAt?: Date | null;
    };
  }>;
};

/**
 * 統合MCPサーバーをAPIレスポンス形式にマッピング
 *
 * 論理削除された子サーバーをフィルタリングするかどうかを制御可能
 *
 * @param server - Prismaから取得した統合サーバーデータ
 * @param options - マッピングオプション
 * @returns APIレスポンス形式の統合サーバーデータ
 */
export const mapToUnifiedMcpServerResponse = (
  server: UnifiedServerWithChildren,
  options: {
    /** 論理削除された子サーバーを除外するかどうか（デフォルト: true） */
    excludeDeletedChildren?: boolean;
  } = {},
): UnifiedMcpServerResponse => {
  const { excludeDeletedChildren = true } = options;

  const childServers = excludeDeletedChildren
    ? server.childServers.filter(
        (child) => child.childMcpServer.deletedAt === null,
      )
    : server.childServers;

  return {
    id: server.id,
    name: server.name,
    description: server.description,
    organizationId: server.organizationId,
    createdBy: server.createdBy,
    mcpServers: childServers.map((child) => ({
      id: child.childMcpServer.id,
      name: child.childMcpServer.name,
      serverStatus: child.childMcpServer.serverStatus,
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
  servers: UnifiedServerWithChildren[],
): UnifiedMcpServerResponse[] =>
  servers.map((server) => mapToUnifiedMcpServerResponse(server));
