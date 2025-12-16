"use client";

import { useState } from "react";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import { ToolCard } from "./ToolCard";
import { RequestStatsCard } from "./RequestStatsCard";
import { DataUsageStatsCard } from "./DataUsageStatsCard";
import { sanitizeErrorMessage } from "./errorUtils";
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
        utils.v2.userMcpServer.findById.setData(
          { id: serverId },
          {
            ...previousData,
            // templateInstancesのツールも更新
            templateInstances: previousData.templateInstances.map(
              (instance) => ({
                ...instance,
                tools: instance.tools.map((tool) =>
                  tool.id === variables.toolId
                    ? { ...tool, isEnabled: variables.isEnabled }
                    : tool,
                ),
              }),
            ),
          },
        );
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
          context.previousData,
        );
      }
      // セキュリティ上の理由でエラーメッセージをサニタイズ
      const safeErrorMessage = sanitizeErrorMessage(
        error,
        "ツールの更新に失敗しました",
      );
      toast.error(safeErrorMessage);
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

  const handleToolToggle = (
    templateInstanceId: string,
    toolId: ToolId,
    enabled: boolean,
  ) => {
    toggleTool({
      templateInstanceId,
      toolId,
      isEnabled: enabled,
    });
  };

  // OFFICIALサーバーかどうかを判定
  const isOfficialServer = server.serverType === "OFFICIAL";

  // すべてのテンプレートインスタンスからツールを集約（OFFICIALサーバー用）
  const allTools = server.templateInstances.flatMap(
    (instance) => instance.tools,
  );

  // 有効化されているツールの数（OFFICIALサーバー用）
  const enabledToolCount = allTools.filter((tool) => tool.isEnabled).length;
  const totalToolCount = allTools.length;

  return (
    <div className="space-y-6">
      {/* 統計カード（横並び） */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RequestStatsCard requestStats={requestStats} />
        <DataUsageStatsCard requestStats={requestStats} />
      </div>

      {/* ツール情報 */}
      {isOfficialServer
        ? // OFFICIALサーバー: 単一インスタンスとして表示
          (() => {
            const firstInstance = server.templateInstances[0];
            if (!firstInstance) return null;

            return (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  利用可能なツール ({enabledToolCount}/{totalToolCount})
                </h3>
                <div className="space-y-4">
                  {firstInstance.tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      isExpanded={expandedTools.has(tool.id)}
                      onToggleExpansion={toggleToolExpansion}
                      isEnabled={tool.isEnabled}
                      onToggleEnabled={(enabled) =>
                        handleToolToggle(
                          firstInstance.id,
                          tool.id as ToolId,
                          enabled,
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })()
        : // CUSTOMサーバー: 各テンプレートインスタンスごとに表示
          server.templateInstances.map((instance) => {
            const instanceEnabledCount = instance.tools.filter(
              (tool) => tool.isEnabled,
            ).length;
            const instanceTotalCount = instance.tools.length;

            return (
              <div key={instance.id} className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {instance.mcpServerTemplate.name} ({instanceEnabledCount}/
                  {instanceTotalCount})
                </h3>
                {instance.tools.length > 0 && (
                  <div className="space-y-4">
                    {instance.tools.map((tool) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        isExpanded={expandedTools.has(tool.id)}
                        onToggleExpansion={toggleToolExpansion}
                        isEnabled={tool.isEnabled}
                        onToggleEnabled={(enabled) =>
                          handleToolToggle(
                            instance.id,
                            tool.id as ToolId,
                            enabled,
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
    </div>
  );
};
