/**
 * @fileoverview ツールルーティングと名前空間管理
 *
 * 複数のRemote MCPサーバーからのツールを統合し、
 * 名前空間ベースのルーティングとキャッシングを提供
 */

import {
  ListToolsResultSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { remoteMcpPool } from "./remoteMcpPool.js";
import { getEnabledServers } from "../config/mcpServers.js";
import type { NamespacedTool, ToolCallResult } from "../types/index.js";
import { McpLogger } from "./mcpLogger.js";

const logger = new McpLogger();

/**
 * キャッシュエントリー
 */
type CacheEntry = {
  tools: NamespacedTool[];
  timestamp: number;
};

/**
 * ツールルーター
 */
export class ToolRouter {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = Number(process.env.CACHE_TTL) || 300; // 5分（秒）

  /**
   * ツール名をパース（名前空間と元の名前に分割）
   */
  private parseToolName(toolName: string): {
    namespace: string;
    originalName: string;
  } {
    const parts = toolName.split(".");
    if (parts.length < 2) {
      throw new Error(
        `Invalid tool name format: ${toolName}. Expected format: namespace.toolName`,
      );
    }

    return {
      namespace: parts[0] ?? "",
      originalName: parts.slice(1).join("."),
    };
  }

  /**
   * ツールに名前空間を付与
   */
  private addNamespace(
    tools: Array<{ name: string; description?: string; inputSchema?: unknown }>,
    namespace: string,
  ): NamespacedTool[] {
    return tools.map((tool) => ({
      name: `${namespace}.${tool.name}`,
      namespace,
      originalName: tool.name,
      description: tool.description || "",
      inputSchema: tool.inputSchema || {},
    }));
  }

  /**
   * キャッシュが有効かチェック
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // 秒に変換
    return age < this.CACHE_TTL;
  }

  /**
   * 全ツールリストを取得（キャッシュ付き）
   */
  async getAllTools(): Promise<NamespacedTool[]> {
    const cacheKey = "all";
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      logger.logInfo("Returning cached tools list", {
        toolCount: cached.tools.length,
      });
      return cached.tools;
    }

    const servers = getEnabledServers();
    const allTools: NamespacedTool[] = [];

    // 全サーバーから並列でツールリストを取得
    const toolPromises = servers.map(async (server) => {
      try {
        const client = await remoteMcpPool.getConnection(server.namespace);

        const result = await client.request(
          {
            method: "tools/list",
          },
          ListToolsResultSchema,
        );

        remoteMcpPool.releaseConnection(server.namespace);

        return this.addNamespace(result.tools, server.namespace);
      } catch (error) {
        logger.logError(server.namespace, "getAllTools", error as Error);
        return [];
      }
    });

    const toolsArrays = await Promise.all(toolPromises);
    toolsArrays.forEach((tools) => allTools.push(...tools));

    // キャッシュに保存
    this.cache.set(cacheKey, {
      tools: allTools,
      timestamp: Date.now(),
    });

    logger.logInfo("Tools list aggregated", {
      serverCount: servers.length,
      toolCount: allTools.length,
    });

    return allTools;
  }

  /**
   * 名前空間ごとのツールリストを取得
   */
  async getToolsByNamespace(namespace: string): Promise<NamespacedTool[]> {
    const cached = this.cache.get(namespace);

    if (cached && this.isCacheValid(cached)) {
      logger.logInfo("Returning cached tools for namespace", {
        namespace,
        toolCount: cached.tools.length,
      });
      return cached.tools;
    }

    try {
      const client = await remoteMcpPool.getConnection(namespace);

      const result = await client.request(
        {
          method: "tools/list",
        },
        ListToolsResultSchema,
      );

      remoteMcpPool.releaseConnection(namespace);

      const namespacedTools = this.addNamespace(result.tools, namespace);

      // キャッシュに保存
      this.cache.set(namespace, {
        tools: namespacedTools,
        timestamp: Date.now(),
      });

      logger.logInfo("Tools list retrieved for namespace", {
        namespace,
        toolCount: namespacedTools.length,
      });

      return namespacedTools;
    } catch (error) {
      logger.logError(namespace, "getToolsByNamespace", error as Error);
      throw error;
    }
  }

  /**
   * ツールを実行
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallResult> {
    const { namespace, originalName } = this.parseToolName(toolName);

    try {
      const client = await remoteMcpPool.getConnection(namespace);

      logger.logInfo("Calling tool", {
        namespace,
        toolName: originalName,
      });

      const result = await client.request(
        {
          method: "tools/call",
          params: {
            name: originalName,
            arguments: args,
          },
        },
        CallToolResultSchema,
      );

      remoteMcpPool.releaseConnection(namespace);

      logger.logInfo("Tool call completed", {
        namespace,
        toolName: originalName,
      });

      return {
        content: result.content.map((item) => ({
          type: item.type,
          text: "text" in item ? String(item.text) : JSON.stringify(item),
        })),
      };
    } catch (error) {
      logger.logError(namespace, "callTool", error as Error, {
        toolName: originalName,
      });
      throw error;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    logger.logInfo("Tool cache cleared");
  }
}
