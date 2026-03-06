/**
 * MCPサーバー関連のユーティリティ関数
 */

import type { RouterOutputs } from "~/trpc/react";

type McpServer = RouterOutputs["userMcpServer"]["findMcpServers"][number];

/**
 * サーバーの有効なツール数を計算
 */
export const countEnabledTools = (server: McpServer): number =>
  server.templateInstances.reduce(
    (count, instance) =>
      count + instance.tools.filter((tool) => tool.isEnabled).length,
    0,
  );

/**
 * 選択されたサーバーの合計ツール数を計算
 */
export const countTotalToolsForSelectedServers = (
  servers: McpServer[],
  selectedIds: string[],
): number =>
  servers
    .filter((server) => selectedIds.includes(server.id))
    .reduce((total, server) => total + countEnabledTools(server), 0);

/**
 * サーバーのアイコンパスを取得（フォールバック対応）
 */
export const getServerIconPath = (server: McpServer): string | null =>
  server.iconPath ??
  server.templateInstances[0]?.mcpServerTemplate?.iconPath ??
  null;

/**
 * サーバーのフォールバックURLを取得
 */
export const getServerFallbackUrl = (
  server: McpServer,
): string | null | undefined =>
  server.templateInstances[0]?.mcpServerTemplate?.url;
