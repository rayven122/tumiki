"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Sparkles, Bot } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useAgentFlow } from "@/atoms/agentFlowAtoms";
import {
  McpDragDropSelector,
  convertToSelectableMcp,
} from "@/components/mcp-selector";
import { MODEL_OPTIONS } from "@/lib/agent";
import type { McpServerId } from "@/schema/ids";

type CreateAgentFormProps = {
  orgSlug: string;
};

/**
 * エージェント作成フォーム
 * 基本情報とMCP選択をドラッグ&ドロップで行うUI
 */
export const CreateAgentForm = ({ orgSlug }: CreateAgentFormProps) => {
  const router = useRouter();
  const { flowState, updateFlowState, resetFlowState, isBasicInfoValid } =
    useAgentFlow();

  // ページ離脱時にフロー状態をリセット
  useEffect(() => {
    return () => {
      resetFlowState();
    };
  }, [resetFlowState]);

  // MCPサーバー一覧を取得
  const { data: mcpServers, isLoading: isLoadingServers } =
    api.v2.userMcpServer.findMcpServers.useQuery();

  // エージェント作成mutation
  const createAgentMutation = api.v2.agent.create.useMutation({
    onSuccess: (data) => {
      toast.success("エージェントを作成しました");
      resetFlowState();
      router.push(`/${orgSlug}/agents/${data.id}`);
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  // 全MCPをSelectableMcp形式に変換
  const allMcps = useMemo(
    () => (mcpServers ?? []).map(convertToSelectableMcp),
    [mcpServers],
  );

  // 選択済みMCPと未選択MCPを分離
  const { availableMcps, selectedMcps } = useMemo(() => {
    const selectedSet = new Set(flowState.selectedMcpServerIds);
    const selectedMap = new Map(
      allMcps
        .filter((mcp) => selectedSet.has(mcp.id))
        .map((mcp) => [mcp.id, mcp]),
    );
    const available = allMcps.filter((mcp) => !selectedSet.has(mcp.id));
    const selected = flowState.selectedMcpServerIds
      .map((id) => selectedMap.get(id))
      .filter((mcp) => mcp !== undefined);

    return { availableMcps: available, selectedMcps: selected };
  }, [allMcps, flowState.selectedMcpServerIds]);

  const handleSelect = useCallback(
    (mcpId: string) => {
      updateFlowState({
        selectedMcpServerIds: [...flowState.selectedMcpServerIds, mcpId],
      });
    },
    [flowState.selectedMcpServerIds, updateFlowState],
  );

  const handleRemove = useCallback(
    (mcpId: string) => {
      updateFlowState({
        selectedMcpServerIds: flowState.selectedMcpServerIds.filter(
          (id) => id !== mcpId,
        ),
      });
    },
    [flowState.selectedMcpServerIds, updateFlowState],
  );

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

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* エージェント名 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                エージェント名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例: 議事録作成アシスタント"
                value={flowState.name}
                onChange={(e) => updateFlowState({ name: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-gray-500">最大50文字</p>
            </div>

            {/* モデル選択 */}
            <div className="space-y-2">
              <Label htmlFor="modelId">AIモデル</Label>
              <Select
                value={flowState.modelId || "default"}
                onValueChange={(value) =>
                  updateFlowState({ modelId: value === "default" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="デフォルト（Claude 3.5 Sonnet）" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* システムプロンプト */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              システムプロンプト <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              placeholder="例: あなたは議事録作成の専門家です。会議の内容を整理し、重要なポイントをまとめてください。"
              value={flowState.systemPrompt}
              onChange={(e) =>
                updateFlowState({ systemPrompt: e.target.value })
              }
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              AIの振る舞いを定義するプロンプトを入力してください
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MCPサーバー選択（ドラッグ&ドロップ） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            MCPサーバー選択
          </CardTitle>
          <p className="text-sm text-gray-600">
            エージェントが使用できるMCPサーバーをドラッグ&ドロップで選択（任意）
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingServers ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <McpDragDropSelector
              availableMcps={availableMcps}
              selectedMcps={selectedMcps}
              onSelect={handleSelect}
              onRemove={handleRemove}
              availableLabel="利用可能なMCP"
              selectedLabel="使用するMCP"
              emptySelectedMessage={
                <>
                  <Bot className="h-8 w-8 text-purple-300" />
                  <span>ここにドラッグ&ドロップ</span>
                  <span className="text-xs">MCPなしでも作成可能</span>
                </>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* 作成ボタン */}
      <Button
        onClick={handleCreate}
        disabled={!isBasicInfoValid || createAgentMutation.isPending}
        className="w-full bg-gray-900 py-6 text-lg hover:bg-gray-800"
        size="lg"
      >
        {createAgentMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            作成中...
          </>
        ) : (
          <>
            <Check className="mr-2 h-5 w-5" />
            エージェントを作成
          </>
        )}
      </Button>
    </div>
  );
};
