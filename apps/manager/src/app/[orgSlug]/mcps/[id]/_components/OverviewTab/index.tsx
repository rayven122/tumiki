"use client";

import { useState } from "react";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import { ToolCard } from "./ToolCard";
import { RequestStatsCard } from "./RequestStatsCard";
import { DataUsageStatsCard } from "./DataUsageStatsCard";
import type { UserMcpServerDetail, RequestStats } from "../types";
import type { McpServerId, ToolId } from "@/schema/ids";

type OverviewTabProps = {
  server: UserMcpServerDetail;
  requestStats?: RequestStats;
  serverId: McpServerId;
};

export const OverviewTab = ({
  server,
  requestStats,
  serverId,
}: OverviewTabProps) => {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const utils = api.useUtils();

  const { mutate: toggleTool } = api.v2.userMcpServer.toggleTool.useMutation({
    // 楽観的更新: サーバーレスポンスを待たずにUIを即座に更新
    onMutate: async (variables) => {
      // 進行中のクエリをキャンセル
      await utils.v2.userMcpServer.findById.cancel({ id: serverId });

      // 現在のデータを取得（ロールバック用）
      const previousData = utils.v2.userMcpServer.findById.getData({
        id: serverId,
      });

      // UIを楽観的に更新
      if (previousData) {
        utils.v2.userMcpServer.findById.setData({ id: serverId }, {
          ...previousData,
          tools: previousData.tools.map((tool) =>
            tool.id === variables.toolId
              ? { ...tool, isEnabled: variables.isEnabled }
              : tool
          ),
        });
      }

      // ロールバック用に前のデータを返す
      return { previousData };
    },
    onSuccess: () => {
      toast.success("ツールの状態を更新しました");
    },
    onError: (error, _variables, context) => {
      // エラー時は元のデータに戻す
      if (context?.previousData) {
        utils.v2.userMcpServer.findById.setData(
          { id: serverId },
          context.previousData
        );
      }
      toast.error(error.message);
    },
    // 成功/失敗に関わらず最終的にデータを再取得して整合性を保つ
    onSettled: async () => {
      await utils.v2.userMcpServer.findById.invalidate({ id: serverId });
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

  const totalToolCount = server.tools.length;

  return (
    <div className="space-y-6">
      {/* 統計カード（横並び） */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RequestStatsCard requestStats={requestStats} />
        <DataUsageStatsCard requestStats={requestStats} />
      </div>

      {/* ツール情報 */}
      {server.tools.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            利用可能なツール ({totalToolCount})
          </h3>

          <div className="space-y-4">
            {server.tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isExpanded={expandedTools.has(tool.id)}
                onToggleExpansion={toggleToolExpansion}
                isEnabled={tool.isEnabled}
                onToggleEnabled={(enabled) =>
                  handleToolToggle(tool.id as ToolId, enabled)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
