/**
 * 統合MCPサーバーのレスポンスマッピング関数
 *
 * Prismaモデルから API レスポンス形式への変換を行う
 */

import type { ServerStatus } from "@tumiki/db";
import type { UnifiedMcpServerResponse } from "./types.js";

/**
 * Prisma から取得した統合MCPサーバーデータの型
 */
export type UnifiedServerWithChildren = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  childServers: Array<{
    mcpServer: {
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
    ? server.childServers.filter((child) => child.mcpServer.deletedAt === null)
    : server.childServers;

  return {
    id: server.id,
    name: server.name,
    description: server.description,
    organizationId: server.organizationId,
    createdBy: server.createdBy,
    mcpServers: childServers.map((child) => ({
      id: child.mcpServer.id,
      name: child.mcpServer.name,
      serverStatus: child.mcpServer.serverStatus,
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
