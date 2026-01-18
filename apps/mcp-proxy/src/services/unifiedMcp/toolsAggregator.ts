/**
 * 統合MCPエンドポイント用ツール集約サービス
 *
 * 複数のMCPサーバーからツールを収集し、3階層フォーマットで統合
 */

import { db, ServerStatus, ServerType } from "@tumiki/db/server";
import type { AggregatedTool } from "./types.js";
import { formatUnifiedToolName } from "./toolNameParser.js";
import {
  getUnifiedToolsFromCache,
  setUnifiedToolsCache,
} from "../../libs/cache/unifiedToolsCache.js";
import { logError, logInfo } from "../../libs/logger/index.js";

/**
 * 統合MCPサーバーのツール一覧を集約して取得
 *
 * 1. Redisキャッシュをチェック
 * 2. キャッシュミス時はDBから子サーバーを取得
 * 3. Fail-fast: 1つでもSTOPPED/ERRORがあればエラー
 * 4. 3階層フォーマットでツール名を生成
 * 5. キャッシュに保存
 *
 * @param unifiedMcpServerId - 統合MCPサーバーID
 * @returns 集約されたツール一覧
 * @throws 子サーバーにSTOPPED/ERRORがある場合
 */
export const aggregateTools = async (
  unifiedMcpServerId: string,
): Promise<AggregatedTool[]> => {
  logInfo("Aggregating tools for unified MCP server", { unifiedMcpServerId });

  // 1. キャッシュをチェック
  const cached = await getUnifiedToolsFromCache(unifiedMcpServerId);
  if (cached !== null) {
    logInfo("Using cached unified tools", {
      unifiedMcpServerId,
      toolCount: cached.length,
    });
    return cached;
  }

  // 2. DBから統合MCPサーバー（serverType=UNIFIED）と子サーバーを取得
  const unifiedServer = await db.mcpServer.findUnique({
    where: {
      id: unifiedMcpServerId,
      serverType: ServerType.UNIFIED,
    },
    include: {
      childServers: {
        orderBy: { displayOrder: "asc" },
        include: {
          childMcpServer: {
            select: {
              id: true,
              name: true,
              serverStatus: true,
              deletedAt: true,
              templateInstances: {
                select: {
                  id: true,
                  normalizedName: true,
                  allowedTools: {
                    select: {
                      name: true,
                      description: true,
                      inputSchema: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!unifiedServer) {
    throw new Error(`Unified MCP server not found: ${unifiedMcpServerId}`);
  }

  // 3. 論理削除された子サーバーを除外
  const activeChildServers = unifiedServer.childServers
    .map((child) => child.childMcpServer)
    .filter((server) => server.deletedAt === null);

  // 全ての子サーバーが除外された場合は空のツール一覧を返す
  if (activeChildServers.length === 0) {
    logInfo("All child servers are deleted, returning empty tool list", {
      unifiedMcpServerId,
    });
    await setUnifiedToolsCache(unifiedMcpServerId, []);
    return [];
  }

  // 4. Fail-fast: STOPPED/ERRORのサーバーがあればエラー
  const problemServers = activeChildServers.filter(
    (server) =>
      server.serverStatus === ServerStatus.STOPPED ||
      server.serverStatus === ServerStatus.ERROR,
  );

  if (problemServers.length > 0) {
    const serverDetails = problemServers
      .map((s) => `${s.name} (${s.serverStatus})`)
      .join(", ");

    logError("Child servers are not running", new Error(serverDetails), {
      unifiedMcpServerId,
      problemServerCount: problemServers.length,
    });

    throw new Error(
      `Cannot aggregate tools: some child servers are not running: ${serverDetails}`,
    );
  }

  // 5. ツールを集約（3階層フォーマット）
  const aggregatedTools: AggregatedTool[] = [];

  for (const server of activeChildServers) {
    for (const instance of server.templateInstances) {
      for (const tool of instance.allowedTools) {
        aggregatedTools.push({
          name: formatUnifiedToolName(
            server.id,
            instance.normalizedName,
            tool.name,
          ),
          description: tool.description,
          inputSchema: tool.inputSchema as Record<string, unknown>,
          mcpServerId: server.id,
          instanceName: instance.normalizedName,
        });
      }
    }
  }

  logInfo("Tools aggregated successfully", {
    unifiedMcpServerId,
    toolCount: aggregatedTools.length,
    serverCount: activeChildServers.length,
  });

  // 6. キャッシュに保存
  await setUnifiedToolsCache(unifiedMcpServerId, aggregatedTools);

  return aggregatedTools;
};

/**
 * 統合MCPサーバーの子サーバー一覧を取得
 *
 * CRUD APIでの表示用（ツール情報なし）
 *
 * @param unifiedMcpServerId - 統合MCPサーバーID
 * @returns 子サーバー一覧
 */
export const getChildServers = async (
  unifiedMcpServerId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    serverStatus: ServerStatus;
  }>
> => {
  const unifiedServer = await db.mcpServer.findUnique({
    where: {
      id: unifiedMcpServerId,
      serverType: ServerType.UNIFIED,
    },
    include: {
      childServers: {
        orderBy: { displayOrder: "asc" },
        include: {
          childMcpServer: {
            select: {
              id: true,
              name: true,
              serverStatus: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  if (!unifiedServer) {
    throw new Error(`Unified MCP server not found: ${unifiedMcpServerId}`);
  }

  // 論理削除されていないサーバーのみ返す
  return unifiedServer.childServers
    .filter((child) => child.childMcpServer.deletedAt === null)
    .map((child) => ({
      id: child.childMcpServer.id,
      name: child.childMcpServer.name,
      serverStatus: child.childMcpServer.serverStatus,
    }));
};
