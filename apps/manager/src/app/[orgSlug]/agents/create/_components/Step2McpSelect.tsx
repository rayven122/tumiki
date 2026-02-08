"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Server, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { useAgentFlow } from "@/atoms/agentFlowAtoms";
import { McpServerIcon } from "../../../mcps/_components/McpServerIcon";
import { cn } from "@/lib/utils";

/**
 * ステップ2: MCPサーバー選択
 */
export const Step2McpSelect = () => {
  const { flowState, updateFlowState, nextStep, prevStep } = useAgentFlow();

  // MCPサーバー一覧を取得
  const { data: mcpServers, isLoading } =
    api.v2.userMcpServer.findMcpServers.useQuery();

  const toggleMcpServer = (serverId: string) => {
    const currentIds = flowState.selectedMcpServerIds;
    const newIds = currentIds.includes(serverId)
      ? currentIds.filter((id) => id !== serverId)
      : [...currentIds, serverId];
    updateFlowState({ selectedMcpServerIds: newIds });
  };

  const selectAll = () => {
    if (mcpServers) {
      updateFlowState({
        selectedMcpServerIds: mcpServers.map((s) => s.id),
      });
    }
  };

  const deselectAll = () => {
    updateFlowState({ selectedMcpServerIds: [] });
  };

  const selectedCount = flowState.selectedMcpServerIds.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-600" />
              MCPサーバーを選択
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                すべて選択
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                選択解除
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            エージェントが使用できるMCPサーバーを選択してください（任意）
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : mcpServers && mcpServers.length > 0 ? (
            <div className="space-y-3">
              {mcpServers.map((server) => {
                const isSelected = flowState.selectedMcpServerIds.includes(
                  server.id,
                );
                const firstInstance = server.templateInstances[0];
                const template = firstInstance?.mcpServerTemplate;

                return (
                  <div
                    key={server.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors",
                      isSelected
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300 hover:bg-gray-50",
                    )}
                    onClick={() => toggleMcpServer(server.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMcpServer(server.id)}
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <McpServerIcon
                        iconPath={server.iconPath ?? template?.iconPath}
                        alt={server.name}
                        size={24}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{server.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      {template?.tags && template.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
              <Server className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                接続済みのMCPサーバーがありません
              </p>
              <p className="text-xs text-gray-500">
                MCPサーバーなしでもエージェントを作成できます
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 選択状態表示 */}
      {selectedCount > 0 && (
        <div className="rounded-lg bg-purple-50 p-4 text-center text-sm text-purple-700">
          {selectedCount}個のMCPサーバーを選択中
        </div>
      )}

      {/* ナビゲーションボタン */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <Button onClick={nextStep}>
          次へ: 確認
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
