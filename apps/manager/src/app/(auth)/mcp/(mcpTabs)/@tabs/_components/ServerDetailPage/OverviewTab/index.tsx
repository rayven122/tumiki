"use client";

import { useState } from "react";
import { toast } from "@/utils/client/toast";
import { StatsCards } from "./StatsCards";
import { ToolCard } from "./ToolCard";
import { ConnectionSettings } from "./ConnectionSettings";
import type { UserMcpServerInstance, RequestStats } from "../types";

type OverviewTabProps = {
  instance: UserMcpServerInstance;
  requestStats: RequestStats;
  onRefresh?: () => Promise<void>;
};

export const OverviewTab = ({ instance, requestStats }: OverviewTabProps) => {
  const [toolStates, setToolStates] = useState<Record<string, boolean>>(() => {
    // 初期状態を設定 (全てtrueとして開始)
    const initialStates: Record<string, boolean> = {};
    instance.toolGroup?.toolGroupTools?.forEach((toolGroupTool) => {
      initialStates[toolGroupTool.tool.id] = true;
    });
    return initialStates;
  });

  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    // UIの状態を即座に更新
    setToolStates((prev) => ({ ...prev, [toolId]: enabled }));

    // TODO: APIを呼び出し (現在は仮実装)
    toast.success(`${enabled ? "有効" : "無効"}にしました`);
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
        {instance.toolGroup?.toolGroupTools &&
          instance.toolGroup.toolGroupTools.length > 0 && (
            <div className="space-y-4 lg:col-span-3">
              <h3 className="text-lg font-semibold">
                利用可能なツール ({instance.toolGroup.toolGroupTools.length})
              </h3>
              <div className="space-y-4">
                {instance.toolGroup.toolGroupTools.map((toolGroupTool) => (
                  <ToolCard
                    key={toolGroupTool.tool.id}
                    toolGroupTool={toolGroupTool}
                    isExpanded={expandedTools.has(toolGroupTool.tool.id)}
                    onToggleExpansion={toggleToolExpansion}
                    isEnabled={toolStates[toolGroupTool.tool.id] ?? true}
                    onToggleEnabled={handleToolToggle}
                  />
                ))}
              </div>
            </div>
          )}

        {/* 接続設定 */}
        <ConnectionSettings instance={instance} />
      </div>
    </div>
  );
};
