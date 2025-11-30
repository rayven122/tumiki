"use client";

import { useState } from "react";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import { StatsCards } from "./StatsCards";
import { ToolCard } from "./ToolCard";
import { ConnectionSettings } from "./ConnectionSettings";
import type {
  UserMcpServerDetail,
  RequestStats,
  ToolStats,
} from "../types";
import type { McpServerId, ToolId } from "@/schema/ids";

type OverviewTabProps = {
  server: UserMcpServerDetail;
  requestStats?: RequestStats;
  toolStats?: ToolStats[];
  serverId: McpServerId;
};

export const OverviewTab = ({
  server,
  requestStats,
  toolStats,
  serverId,
}: OverviewTabProps) => {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const { mutate: toggleTool } = api.v2.userMcpServer.toggleTool.useMutation({
    onSuccess: () => {
      toast.success("ツールの状態を更新しました");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const handleToolToggle = (toolId: ToolId, enabled: boolean) => {
    toggleTool({
      userMcpServerId: serverId,
      toolId,
      isEnabled: enabled,
    });
  };

  const enabledToolCount = server.tools.filter((tool) => tool.isEnabled).length;
  const totalToolCount = server.tools.length;

  return (
    <div className="space-y-6">
      <StatsCards requestStats={requestStats} />

      {/* ツール情報と接続設定 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ツール情報 */}
        {server.tools.length > 0 && (
          <div className="space-y-4 lg:col-span-3">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                利用可能なツール ({enabledToolCount}/{totalToolCount})
              </h3>
            </div>

            <div className="space-y-4">
              {server.tools.map((tool) => {
                const toolStat = toolStats?.find(
                  (stat) => stat.toolName === tool.name,
                );
                return (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    isExpanded={expandedTools.has(tool.id)}
                    onToggleExpansion={toggleToolExpansion}
                    isEnabled={tool.isEnabled}
                    onToggleEnabled={(enabled) =>
                      handleToolToggle(tool.id as ToolId, enabled)
                    }
                    callCount={toolStat?.requestCount}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 接続設定 */}
        <ConnectionSettings server={server} />
      </div>
    </div>
  );
};
