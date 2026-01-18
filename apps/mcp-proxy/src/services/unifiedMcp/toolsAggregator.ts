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

/** テンプレートインスタンスのDBクエリ結果の型 */
type TemplateInstanceWithTools = {
  normalizedName: string;
  mcpServerTemplate: {
    id: string;
    name: string;
    mcpTools: Array<{
      name: string;
      description: string | null;
      inputSchema: unknown;
    }>;
  };
};

/**
 * テンプレートインスタンスからツールを抽出して集約形式に変換
 */
const extractToolsFromInstance = (
  unifiedMcpServerId: string,
  instance: TemplateInstanceWithTools,
): AggregatedTool[] =>
  instance.mcpServerTemplate.mcpTools.map((tool) => ({
    name: formatUnifiedToolName(
      unifiedMcpServerId,
      instance.normalizedName,
      tool.name,
    ),
    description: tool.description,
    inputSchema: tool.inputSchema as Record<string, unknown>,
    mcpServerId: unifiedMcpServerId,
    instanceName: instance.normalizedName,
  }));

/**
 * 統合MCPサーバーのツール一覧を集約して取得
 *
 * 処理フロー:
 * 1. Redisキャッシュをチェック
 * 2. キャッシュミス時はDBからテンプレートインスタンスを取得
 * 3. 有効なテンプレートのみからツールを収集
 * 4. 3階層フォーマットでツール名を生成
 * 5. キャッシュに保存
 */
export const aggregateTools = async (
  unifiedMcpServerId: string,
): Promise<AggregatedTool[]> => {
  logInfo("Aggregating tools for unified MCP server", { unifiedMcpServerId });

  // キャッシュをチェック
  const cached = await getUnifiedToolsFromCache(unifiedMcpServerId);
  if (cached !== null) {
    logInfo("Using cached unified tools", {
      unifiedMcpServerId,
      toolCount: cached.length,
    });
    return cached;
  }

  // DBから統合MCPサーバー（serverType=UNIFIED）とテンプレートインスタンスを取得
  const unifiedServer = await db.mcpServer.findUnique({
    where: {
      id: unifiedMcpServerId,
      serverType: ServerType.UNIFIED,
    },
    include: {
      templateInstances: {
        orderBy: { displayOrder: "asc" },
        where: { isEnabled: true },
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

  // テンプレートインスタンスがない場合は空のツール一覧を返す
  if (unifiedServer.templateInstances.length === 0) {
    logInfo("No enabled template instances, returning empty tool list", {
      unifiedMcpServerId,
    });
    await setUnifiedToolsCache(unifiedMcpServerId, []);
    return [];
  }

  // flatMapを使用してツールを集約（3階層フォーマット）
  const aggregatedTools = unifiedServer.templateInstances.flatMap((instance) =>
    extractToolsFromInstance(unifiedMcpServerId, instance),
  );

  logInfo("Tools aggregated successfully", {
    unifiedMcpServerId,
    toolCount: aggregatedTools.length,
    templateInstanceCount: unifiedServer.templateInstances.length,
  });

  // キャッシュに保存
  await setUnifiedToolsCache(unifiedMcpServerId, aggregatedTools);

  return aggregatedTools;
};
