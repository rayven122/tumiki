"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Check,
  Bot,
  Server,
  Lock,
  Building2,
  Loader2,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useAgentFlow } from "@/atoms/agentFlowAtoms";
import { McpServerIcon } from "../../../mcps/_components/McpServerIcon";
import type { McpServerId } from "@/schema/ids";

type Step3ReviewProps = {
  onSuccess: (agentId: string) => void;
};

// 可視性ラベル
const VISIBILITY_LABELS = {
  PRIVATE: { icon: Lock, label: "自分のみ" },
  ORGANIZATION: { icon: Building2, label: "組織内" },
  PUBLIC: { icon: Building2, label: "公開" },
} as const;

/**
 * ステップ3: 確認・作成
 * ピーク・エンドの法則: 完了時の達成感を演出
 */
export const Step3Review = ({ onSuccess }: Step3ReviewProps) => {
  const { flowState, prevStep, isBasicInfoValid, resetFlowState } =
    useAgentFlow();

  // MCPサーバー一覧を取得（選択されたサーバーの詳細表示用）
  const { data: mcpServers } = api.v2.userMcpServer.findMcpServers.useQuery();

  // 選択されたMCPサーバーの詳細を取得
  const selectedServers =
    mcpServers?.filter((s) => flowState.selectedMcpServerIds.includes(s.id)) ??
    [];

  // エージェント作成mutation
  const createAgentMutation = api.v2.agent.create.useMutation({
    onSuccess: (data) => {
      toast.success("エージェントを作成しました");
      resetFlowState();
      onSuccess(data.id);
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  const handleCreate = () => {
    createAgentMutation.mutate({
      name: flowState.name,
      systemPrompt: flowState.systemPrompt,
      modelId: flowState.modelId || undefined,
      visibility: flowState.visibility,
      mcpServerIds:
        flowState.selectedMcpServerIds.length > 0
          ? flowState.selectedMcpServerIds.map((id) => id as McpServerId)
          : undefined,
    });
  };

  const visibilityInfo = VISIBILITY_LABELS[flowState.visibility];
  const VisibilityIcon = visibilityInfo.icon;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 確認カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-purple-600" />
            作成内容の確認
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">基本情報</h3>
            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Bot className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">{flowState.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <VisibilityIcon className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">{visibilityInfo.label}</span>
              </div>

              {flowState.modelId && (
                <div className="text-sm text-gray-600">
                  モデル: {flowState.modelId}
                </div>
              )}
            </div>
          </div>

          {/* システムプロンプト */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              システムプロンプト
            </h3>
            <div className="rounded-lg bg-gray-50 p-4">
              <pre className="font-mono text-sm whitespace-pre-wrap text-gray-700">
                {flowState.systemPrompt}
              </pre>
            </div>
          </div>

          {/* MCPサーバー */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              MCPサーバー
              {selectedServers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedServers.length}
                </Badge>
              )}
            </h3>
            {selectedServers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedServers.map((server) => {
                  const template =
                    server.templateInstances[0]?.mcpServerTemplate;
                  return (
                    <div
                      key={server.id}
                      className="flex items-center gap-2 rounded-full bg-gray-100 py-1 pr-3 pl-1"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                        <McpServerIcon
                          iconPath={server.iconPath ?? template?.iconPath}
                          alt={server.name}
                          size={16}
                        />
                      </div>
                      <span className="text-sm">{server.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                <Server className="h-4 w-4" />
                <span>MCPサーバーなし</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={createAgentMutation.isPending}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!isBasicInfoValid || createAgentMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {createAgentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              作成中...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              エージェントを作成
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
