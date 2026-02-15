"use client";

import { useState, useMemo } from "react";
import { toast } from "@/lib/client/toast";
import { api } from "@/trpc/react";
import { ToolCard } from "./ToolCard";
import { RequestStatsCard } from "./RequestStatsCard";
import { DataUsageStatsCard } from "./DataUsageStatsCard";
import { sanitizeErrorMessage } from "./errorUtils";
import { EntityIcon } from "@/components/ui/EntityIcon";
import { cn } from "@/lib/utils";
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
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );
  const utils = api.useUtils();

  const { mutate: toggleTool } = api.userMcpServer.toggleTool.useMutation({
    // 楽観的更新: サーバーレスポンスを待たずにUIを即座に更新
    onMutate: async (variables) => {
      // 進行中のクエリをキャンセル
      await utils.userMcpServer.findById.cancel({ id: serverId });

      // 現在のデータを取得（ロールバック用）
      const previousData = utils.userMcpServer.findById.getData({
        id: serverId,
      });

      // UIを楽観的に更新
      if (previousData) {
        utils.userMcpServer.findById.setData(
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
        utils.userMcpServer.findById.setData(
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
      await utils.userMcpServer.findById.invalidate({ id: serverId });
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

  // CUSTOMサーバー: 全ツールをフラット化（インスタンス情報を保持）
  const allToolsWithInstance = useMemo(() => {
    return server.templateInstances.flatMap((instance) =>
      instance.tools.map((tool) => ({
        ...tool,
        templateInstanceId: instance.id,
        mcpServerTemplate: instance.mcpServerTemplate,
      })),
    );
  }, [server.templateInstances]);

  // フィルタリングされたツール
  const filteredTools = useMemo(() => {
    if (!selectedInstanceId) return allToolsWithInstance;
    return allToolsWithInstance.filter(
      (tool) => tool.templateInstanceId === selectedInstanceId,
    );
  }, [allToolsWithInstance, selectedInstanceId]);

  // 有効化されているツールの数
  const enabledToolCount = filteredTools.filter(
    (tool) => tool.isEnabled,
  ).length;
  const totalToolCount = filteredTools.length;

  // テンプレートインスタンスが複数あるか（フィルターボタン表示用）
  const hasMultipleInstances = server.templateInstances.length > 1;

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
        : // CUSTOMサーバー: フィルターボタン形式で表示
          allToolsWithInstance.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                利用可能なツール ({enabledToolCount}/{totalToolCount})
              </h3>

              {/* サーバーフィルターボタン（複数インスタンスがある場合のみ表示） */}
              {hasMultipleInstances && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedInstanceId(null)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      selectedInstanceId === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80",
                    )}
                  >
                    ALL
                  </button>
                  {server.templateInstances.map((instance) => (
                    <button
                      key={instance.id}
                      onClick={() => setSelectedInstanceId(instance.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        selectedInstanceId === instance.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80",
                      )}
                    >
                      <EntityIcon
                        iconPath={instance.mcpServerTemplate.iconPath}
                        fallbackUrl={instance.mcpServerTemplate.url}
                        type="mcp"
                        size="xs"
                        alt={instance.mcpServerTemplate.name}
                      />
                      <span>{instance.mcpServerTemplate.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ツール一覧 */}
              <div className="space-y-4">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={`${tool.templateInstanceId}-${tool.id}`}
                    tool={tool}
                    isExpanded={expandedTools.has(tool.id)}
                    onToggleExpansion={toggleToolExpansion}
                    isEnabled={tool.isEnabled}
                    onToggleEnabled={(enabled) =>
                      handleToolToggle(
                        tool.templateInstanceId,
                        tool.id as ToolId,
                        enabled,
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
    </div>
  );
};
