/**
 * 統合MCPエンドポイント用ツール集約サービス
 *
 * 統合MCPサーバーのテンプレートインスタンスからツールを収集し、
 * 3階層フォーマットで統合
 */

import { db, ServerType } from "@tumiki/db/server";
import type { AggregatedTool } from "./types.js";
import { formatUnifiedToolName } from "./toolNameParser.js";
import {
  getUnifiedToolsFromCache,
  setUnifiedToolsCache,
} from "../../libs/cache/unifiedToolsCache.js";
import { logInfo } from "../../libs/logger/index.js";

/**
 * 統合MCPサーバーのツール一覧を集約して取得
 *
 * 1. Redisキャッシュをチェック
 * 2. キャッシュミス時はDBからテンプレートインスタンスを取得
 * 3. 有効なテンプレートのみからツールを収集
 * 4. 3階層フォーマットでツール名を生成
 * 5. キャッシュに保存
 *
 * @param unifiedMcpServerId - 統合MCPサーバーID
 * @returns 集約されたツール一覧
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

  // 2. DBから統合MCPサーバー（serverType=UNIFIED）とテンプレートインスタンスを取得
  const unifiedServer = await db.mcpServer.findUnique({
    where: {
      id: unifiedMcpServerId,
      serverType: ServerType.UNIFIED,
    },
    include: {
      templateInstances: {
        orderBy: { displayOrder: "asc" },
        where: {
          isEnabled: true, // 有効なインスタンスのみ
        },
        include: {
          mcpServerTemplate: {
            select: {
              id: true,
              name: true,
              mcpTools: {
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
  });

  if (!unifiedServer) {
    throw new Error(`Unified MCP server not found: ${unifiedMcpServerId}`);
  }

  // 3. テンプレートインスタンスがない場合は空のツール一覧を返す
  if (unifiedServer.templateInstances.length === 0) {
    logInfo("No enabled template instances, returning empty tool list", {
      unifiedMcpServerId,
    });
    await setUnifiedToolsCache(unifiedMcpServerId, []);
    return [];
  }

  // 4. ツールを集約（3階層フォーマット: unifiedMcpServerId__normalizedName__toolName）
  const aggregatedTools: AggregatedTool[] = [];

  for (const instance of unifiedServer.templateInstances) {
    const template = instance.mcpServerTemplate;

    for (const tool of template.mcpTools) {
      aggregatedTools.push({
        // ツール名フォーマット: 統合サーバーID__インスタンス名__ツール名
        name: formatUnifiedToolName(
          unifiedMcpServerId,
          instance.normalizedName,
          tool.name,
        ),
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
        // 実行時に使用されるMCPサーバーID（統合サーバーID）
        mcpServerId: unifiedMcpServerId,
        instanceName: instance.normalizedName,
      });
    }
  }

  logInfo("Tools aggregated successfully", {
    unifiedMcpServerId,
    toolCount: aggregatedTools.length,
    templateInstanceCount: unifiedServer.templateInstances.length,
  });

  // 5. キャッシュに保存
  await setUnifiedToolsCache(unifiedMcpServerId, aggregatedTools);

  return aggregatedTools;
};
