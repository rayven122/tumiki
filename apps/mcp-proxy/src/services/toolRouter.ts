/**
 * @fileoverview ツールルーティングと名前空間管理（シンプル版）
 *
 * 複数のRemote MCPサーバーからのツールを統合し、
 * 名前空間ベースのルーティングを提供
 *
 * キャッシュなし - Cloud Runステートレス環境に最適化
 */

import {
  ListToolsResultSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getEnabledServers } from "../config/mcpServers.js";
import type { NamespacedTool, ToolCallResult } from "../types/index.js";
import { logInfo, logError } from "../utils/logger.js";
import { withMcpClient } from "../utils/mcpWrapper.js";

/**
 * ツールルーター
 */
export class ToolRouter {
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
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? {},
    }));
  }

  /**
   * 全ツールリストを取得
   * キャッシュなし - 毎回Remote MCPサーバーから取得
   */
  async getAllTools(): Promise<NamespacedTool[]> {
    const servers = getEnabledServers();
    const allTools: NamespacedTool[] = [];

    // 全サーバーから並列でツールリストを取得
    const toolPromises = servers.map(async (server) => {
      try {
        const result = await withMcpClient(
          server.namespace,
          server.config,
          async (client) => {
            return await client.request(
              {
                method: "tools/list",
              },
              ListToolsResultSchema,
            );
          },
        );

        return this.addNamespace(result.tools, server.namespace);
      } catch (error) {
        logError(
          `Failed to get tools from ${server.namespace}`,
          error as Error,
        );
        return [];
      }
    });

    const toolsArrays = await Promise.all(toolPromises);
    toolsArrays.forEach((tools) => allTools.push(...tools));

    logInfo("Tools list aggregated", {
      serverCount: servers.length,
      toolCount: allTools.length,
    });

    return allTools;
  }

  /**
   * 名前空間ごとのツールリストを取得
   */
  async getToolsByNamespace(namespace: string): Promise<NamespacedTool[]> {
    const servers = getEnabledServers();
    const serverInfo = servers.find((s) => s.namespace === namespace);

    if (!serverInfo) {
      throw new Error(
        `Server configuration not found for namespace: ${namespace}`,
      );
    }

    try {
      const result = await withMcpClient(
        namespace,
        serverInfo.config,
        async (client) => {
          return await client.request(
            {
              method: "tools/list",
            },
            ListToolsResultSchema,
          );
        },
      );

      const namespacedTools = this.addNamespace(result.tools, namespace);

      logInfo("Tools list retrieved for namespace", {
        namespace,
        toolCount: namespacedTools.length,
      });

      return namespacedTools;
    } catch (error) {
      logError(`Failed to get tools for ${namespace}`, error as Error);
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
    const servers = getEnabledServers();
    const serverInfo = servers.find((s) => s.namespace === namespace);

    if (!serverInfo) {
      throw new Error(
        `Server configuration not found for namespace: ${namespace}`,
      );
    }

    try {
      logInfo("Calling tool", {
        namespace,
        toolName: originalName,
      });

      const result = await withMcpClient(
        namespace,
        serverInfo.config,
        async (client) => {
          return await client.request(
            {
              method: "tools/call",
              params: {
                name: originalName,
                arguments: args,
              },
            },
            CallToolResultSchema,
          );
        },
      );

      logInfo("Tool call completed", {
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
      logError(
        `Failed to call tool ${namespace}.${originalName}`,
        error as Error,
      );
      throw error;
    }
  }
}
