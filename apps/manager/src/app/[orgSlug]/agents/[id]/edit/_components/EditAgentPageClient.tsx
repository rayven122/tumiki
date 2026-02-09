"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Bot, Save, Loader2, Server } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { McpServerVisibility } from "@tumiki/db/prisma";
import type { AgentId, McpServerId } from "@/schema/ids";
import { McpServerIcon } from "../../../../mcps/_components/McpServerIcon";

type EditAgentPageClientProps = {
  orgSlug: string;
  agentId: string;
};

// モデル選択肢
const MODEL_OPTIONS = [
  { value: "", label: "デフォルト（Claude 3.5 Sonnet）" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku（高速）" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus（高性能）" },
];

// 公開範囲は組織内に固定
const FIXED_VISIBILITY = McpServerVisibility.ORGANIZATION;

/**
 * 編集フォームの状態型
 */
type EditFormState = {
  name: string;
  systemPrompt: string;
  modelId: string;
  visibility: McpServerVisibility;
  selectedMcpServerIds: string[];
};

/**
 * 編集フォームコンポーネント
 */
const EditForm = ({
  orgSlug,
  agentId,
}: {
  orgSlug: string;
  agentId: string;
}) => {
  const router = useRouter();
  const utils = api.useUtils();

  // エージェント情報を取得
  const [agent] = api.v2.agent.findById.useSuspenseQuery({
    id: agentId as AgentId,
  });

  // MCPサーバー一覧を取得
  const { data: mcpServers } = api.v2.userMcpServer.findMcpServers.useQuery();

  // フォーム状態（公開範囲は組織内に固定）
  const [formState, setFormState] = useState<EditFormState>({
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    modelId: agent.modelId ?? "",
    visibility: FIXED_VISIBILITY,
    selectedMcpServerIds: agent.mcpServers.map((s) => s.id),
  });

  // 更新mutation
  const updateMutation = api.v2.agent.update.useMutation({
    onSuccess: async () => {
      toast.success("エージェントを更新しました");
      await utils.v2.agent.findById.invalidate({ id: agentId as AgentId });
      await utils.v2.agent.findAll.invalidate();
      router.push(`/${orgSlug}/agents/${agentId}`);
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  const updateFormState = (updates: Partial<EditFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const toggleMcpServer = (serverId: string) => {
    setFormState((prev) => {
      const isSelected = prev.selectedMcpServerIds.includes(serverId);
      return {
        ...prev,
        selectedMcpServerIds: isSelected
          ? prev.selectedMcpServerIds.filter((id) => id !== serverId)
          : [...prev.selectedMcpServerIds, serverId],
      };
    });
  };

  const handleSubmit = () => {
    updateMutation.mutate({
      id: agentId as AgentId,
      name: formState.name,
      systemPrompt: formState.systemPrompt,
      modelId: formState.modelId || undefined,
      visibility: formState.visibility,
      mcpServerIds:
        formState.selectedMcpServerIds.length > 0
          ? (formState.selectedMcpServerIds as McpServerId[])
          : undefined,
    });
  };

  const isValid =
    formState.name.trim().length > 0 &&
    formState.systemPrompt.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* エージェント名 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              エージェント名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例: 議事録作成アシスタント"
              value={formState.name}
              onChange={(e) => updateFormState({ name: e.target.value })}
              maxLength={50}
            />
          </div>

          {/* システムプロンプト */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              システムプロンプト <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              placeholder="例: あなたは議事録作成の専門家です。"
              value={formState.systemPrompt}
              onChange={(e) =>
                updateFormState({ systemPrompt: e.target.value })
              }
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {/* モデル選択 */}
          <div className="space-y-2">
            <Label htmlFor="modelId">AIモデル</Label>
            <Select
              value={formState.modelId || "default"}
              onValueChange={(value) =>
                updateFormState({ modelId: value === "default" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="デフォルト（Claude 3.5 Sonnet）" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value || "default"}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 公開範囲（組織内に固定） */}
          <div className="space-y-2">
            <Label>公開範囲</Label>
            <div className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
              <span className="font-medium">組織内</span>
              <span className="text-sm text-gray-500">
                組織メンバー全員が使用可能
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MCPサーバー選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            MCPサーバー
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mcpServers && mcpServers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {mcpServers.map((server) => {
                const isSelected = formState.selectedMcpServerIds.includes(
                  server.id,
                );
                const template = server.templateInstances[0]?.mcpServerTemplate;
                return (
                  <div
                    key={server.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-purple-500 bg-purple-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleMcpServer(server.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <McpServerIcon
                        iconPath={server.iconPath ?? template?.iconPath}
                        alt={server.name}
                        size={24}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{server.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              MCPサーバーがありません
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={`/${orgSlug}/agents/${agentId}`}>キャンセル</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || updateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * スケルトンローダー
 */
const EditFormSkeleton = () => (
  <div className="space-y-6">
    <div className="h-80 animate-pulse rounded-lg bg-gray-200" />
    <div className="h-48 animate-pulse rounded-lg bg-gray-200" />
  </div>
);

/**
 * エージェント編集ページのクライアントコンポーネント
 */
export const EditAgentPageClient = ({
  orgSlug,
  agentId,
}: EditAgentPageClientProps) => {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/${orgSlug}/agents/${agentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            詳細に戻る
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">エージェントを編集</h1>
        </div>
      </div>

      <Suspense fallback={<EditFormSkeleton />}>
        <EditForm orgSlug={orgSlug} agentId={agentId} />
      </Suspense>
    </div>
  );
};
