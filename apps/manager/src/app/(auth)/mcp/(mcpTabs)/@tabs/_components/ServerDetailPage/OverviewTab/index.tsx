"use client";

import { useState, useMemo } from "react";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import { StatsCards } from "./StatsCards";
import { ToolCard } from "./ToolCard";
import { ConnectionSettings } from "./ConnectionSettings";
import { Server } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { UserMcpServerInstance, RequestStats } from "../types";

type OverviewTabProps = {
  instance: UserMcpServerInstance;
  requestStats: RequestStats;
  toolStats?: Array<{
    toolName: string;
    count: number;
    avgDuration: number;
    errorCount: number;
    errorRate: number;
  }>;
  onRefresh?: () => Promise<void>;
};

export const OverviewTab = ({
  instance,
  requestStats,
  toolStats,
}: OverviewTabProps) => {
  const { mutate: toggleTool } =
    api.userMcpServerInstance.toggleTool.useMutation({
      onSuccess: () => {
        toast.success("ツールの状態を更新しました");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // 新スキーマ：availableToolsを使用
  type Tool = {
    id: string;
    name: string;
    description: string | null;
    inputSchema: unknown;
    isEnabled: boolean;
    mcpConfigId: string | null;
    mcpServerTemplate: {
      id: string;
      name: string;
      iconPath: string | null;
    } | null;
  };

  const allTools: Tool[] = instance.availableTools || [];

  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  // MCPサーバーテンプレートの一覧を取得
  const uniqueServers = useMemo(() => {
    const serverMap = new Map<
      string,
      { id: string; name: string; iconPath: string | null }
    >();
    allTools.forEach((tool) => {
      if (tool.mcpServerTemplate && !serverMap.has(tool.mcpServerTemplate.id)) {
        serverMap.set(tool.mcpServerTemplate.id, tool.mcpServerTemplate);
      }
    });
    return Array.from(serverMap.values());
  }, [allTools]);

  // フィルタリングされたツール
  const filteredTools = useMemo(() => {
    if (!selectedServerId) return allTools;
    return allTools.filter(
      (tool) => tool.mcpServerTemplate?.id === selectedServerId,
    );
  }, [allTools, selectedServerId]);

  // 有効化されているツールの数を計算
  const enabledToolCount = filteredTools.filter(
    (tool) => tool.isEnabled,
  ).length;
  const totalToolCount = filteredTools.length;

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    toggleTool({
      instanceId: instance.id,
      toolId,
      enabled,
    });
  };

  const toggleToolExpansion = (toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <StatsCards requestStats={requestStats} />

      {/* ツール情報と接続設定 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ツール情報 */}
        {allTools.length > 0 && (
          <div className="space-y-4 lg:col-span-3">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                利用可能なツール ({enabledToolCount}/{totalToolCount})
              </h3>

              {/* サーバーフィルターボタン */}
              {uniqueServers.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedServerId(null)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      selectedServerId === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80",
                    )}
                  >
                    ALL
                  </button>
                  {uniqueServers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => setSelectedServerId(server.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        selectedServerId === server.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80",
                      )}
                    >
                      <div className="flex h-5 w-5 items-center justify-center">
                        {server.iconPath ? (
                          <Image
                            src={server.iconPath}
                            alt={server.name}
                            width={16}
                            height={16}
                            className="h-4 w-4"
                          />
                        ) : (
                          <Server className="h-4 w-4" />
                        )}
                      </div>
                      <span>{server.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {filteredTools.map((tool) => {
                const toolStat = toolStats?.find(
                  (stat) => stat.toolName === tool.name,
                );
                return (
                  <ToolCard
                    key={`${tool.id}-${tool.mcpConfigId}`}
                    tool={tool}
                    isExpanded={expandedTools.has(tool.id)}
                    onToggleExpansion={toggleToolExpansion}
                    isEnabled={tool.isEnabled}
                    onToggleEnabled={(enabled) =>
                      handleToolToggle(tool.id, enabled)
                    }
                    callCount={toolStat?.count}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 接続設定 */}
        <ConnectionSettings instance={instance} />
      </div>
    </div>
  );
};
