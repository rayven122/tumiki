"use client";

import { useState } from "react";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import { ToolCard } from "./ToolCard";
import { RequestStatsCard } from "./RequestStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type {
  UserMcpServerDetail,
  RequestStats,
  ToolStats,
  RequestLog,
} from "../types";
import type { McpServerId, ToolId } from "@/schema/ids";

type OverviewTabProps = {
  server: UserMcpServerDetail;
  requestStats?: RequestStats;
  toolStats?: ToolStats[];
  requestLogs?: RequestLog[];
  serverId: McpServerId;
};

export const OverviewTab = ({
  server,
  requestStats,
  toolStats,
  requestLogs,
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

  // 最新のログを5件取得
  const recentLogs = requestLogs?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* リクエスト統計カード */}
      <RequestStatsCard requestStats={requestStats} />

      {/* 最近のリクエストログ */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              最近のリクエスト
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-2 last:border-b-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.method}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          log.httpStatus.startsWith("2")
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.httpStatus}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {log.durationMs}ms
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ツール情報 */}
      {server.tools.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            利用可能なツール ({enabledToolCount}/{totalToolCount})
          </h3>

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
    </div>
  );
};
