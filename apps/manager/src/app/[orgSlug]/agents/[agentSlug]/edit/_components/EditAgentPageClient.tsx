"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Textarea } from "@tumiki/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { ArrowLeft, Bot, Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { McpServerVisibility } from "@tumiki/db/prisma";
import type { AgentId, McpServerId } from "@/schema/ids";
import {
  McpDragDropSelector,
  convertToSelectableMcp,
} from "@/features/mcps/components/mcp-selector";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS } from "@/features/agents/constants";
import {
  SlackNotificationSettings,
  AgentPersonaSelector,
  type SlackChannel,
} from "@/features/agents/components";

type EditAgentPageClientProps = {
  orgSlug: string;
  agentSlug: string;
};

// 公開範囲は組織内に固定
const FIXED_VISIBILITY = McpServerVisibility.ORGANIZATION;

/**
 * 編集フォームの状態型
 */
type EditFormState = {
  name: string;
  slug: string;
  systemPrompt: string;
  personaId: string;
  modelId: string;
  visibility: McpServerVisibility;
  selectedMcpServerIds: string[];
  // Slack通知設定
  enableSlackNotification: boolean;
  slackNotificationChannelId: string;
  slackNotificationChannelName: string;
  notifyOnlyOnFailure: boolean;
};

/**
 * 編集フォームコンポーネント
 */
const EditForm = ({
  orgSlug,
  agentSlug,
}: {
  orgSlug: string;
  agentSlug: string;
}) => {
  const router = useRouter();
  const utils = api.useUtils();

  // スラグでエージェント情報を取得
  const [agent] = api.agent.findBySlug.useSuspenseQuery({
    slug: agentSlug,
  });

  // MCPサーバー一覧を取得
  const { data: mcpServers, isLoading: isLoadingServers } =
    api.userMcpServer.findMcpServers.useQuery();

  // Slack連携状態を取得
  const { data: slackConnectionStatus } =
    api.slackIntegration.getConnectionStatus.useQuery();

  // Slackチャンネル一覧を取得（連携済みの場合のみ）
  const { data: slackChannels } = api.slackIntegration.listChannels.useQuery(
    undefined,
    {
      enabled: slackConnectionStatus?.isConnected === true,
    },
  );

  // Slackチャンネルを SlackChannel 型に変換
  const formattedSlackChannels: SlackChannel[] | undefined = slackChannels?.map(
    (ch) => ({
      id: ch.id,
      name: ch.name,
    }),
  );

  // フォーム状態（公開範囲は組織内に固定）
  const [formState, setFormState] = useState<EditFormState>({
    name: agent.name,
    slug: agent.slug,
    systemPrompt: agent.systemPrompt,
    personaId: agent.personaId ?? "",
    modelId: agent.modelId ?? "",
    visibility: FIXED_VISIBILITY,
    selectedMcpServerIds: agent.mcpServers.map((s) => s.id),
    // Slack通知設定
    enableSlackNotification: agent.enableSlackNotification,
    slackNotificationChannelId: agent.slackNotificationChannelId ?? "",
    slackNotificationChannelName: agent.slackNotificationChannelName ?? "",
    notifyOnlyOnFailure: agent.notifyOnlyOnFailure,
  });

  // 更新mutation
  const updateMutation = api.agent.update.useMutation({
    onSuccess: async () => {
      toast.success("エージェントを更新しました");
      await utils.agent.findBySlug.invalidate({ slug: formState.slug });
      await utils.agent.findAll.invalidate();
      // スラグが変更された場合は新しいスラグのURLにリダイレクト
      router.push(`/${orgSlug}/agents/${formState.slug}`);
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  const updateFormState = useCallback((updates: Partial<EditFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 全MCPをSelectableMcp形式に変換
  const allMcps = useMemo(
    () => (mcpServers ?? []).map(convertToSelectableMcp),
    [mcpServers],
  );

  // 選択済みMCPと未選択MCPを分離
  const { availableMcps, selectedMcps } = useMemo(() => {
    const selectedSet = new Set(formState.selectedMcpServerIds);
    const selectedMap = new Map(
      allMcps
        .filter((mcp) => selectedSet.has(mcp.id))
        .map((mcp) => [mcp.id, mcp]),
    );
    const available = allMcps.filter((mcp) => !selectedSet.has(mcp.id));
    const selected = formState.selectedMcpServerIds
      .map((id) => selectedMap.get(id))
      .filter((mcp) => mcp !== undefined);

    return { availableMcps: available, selectedMcps: selected };
  }, [allMcps, formState.selectedMcpServerIds]);

  const handleSelect = useCallback((mcpId: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedMcpServerIds: [...prev.selectedMcpServerIds, mcpId],
    }));
  }, []);

  const handleRemove = useCallback((mcpId: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedMcpServerIds: prev.selectedMcpServerIds.filter(
        (id) => id !== mcpId,
      ),
    }));
  }, []);

  const handleSubmit = () => {
    updateMutation.mutate({
      id: agent.id as AgentId,
      name: formState.name,
      slug: formState.slug,
      systemPrompt: formState.systemPrompt,
      personaId: formState.personaId || null,
      modelId: formState.modelId || DEFAULT_MODEL_ID,
      visibility: formState.visibility,
      mcpServerIds:
        formState.selectedMcpServerIds.length > 0
          ? (formState.selectedMcpServerIds as McpServerId[])
          : undefined,
      // Slack通知設定
      enableSlackNotification: formState.enableSlackNotification,
      slackNotificationChannelId: formState.slackNotificationChannelId || null,
      slackNotificationChannelName:
        formState.slackNotificationChannelName || null,
      notifyOnlyOnFailure: formState.notifyOnlyOnFailure,
    });
  };

  const isValid =
    formState.name.trim().length > 0 &&
    formState.slug.trim().length > 0 &&
    formState.systemPrompt.trim().length > 0;

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
                value={formState.name}
                onChange={(e) => updateFormState({ name: e.target.value })}
                maxLength={50}
              />
              <p className="text-xs text-gray-500">最大50文字</p>
            </div>

            {/* スラグ */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                スラグ（URL識別子） <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="例: meeting-notes-agent"
                value={formState.slug}
                onChange={(e) =>
                  updateFormState({
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\-_]/g, ""),
                  })
                }
                maxLength={50}
              />
              <p className="text-xs text-gray-500">
                英小文字、数字、ハイフン、アンダースコアのみ使用可能
              </p>
              {/* スラグプレビュー表示 */}
              {formState.slug && (
                <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">URL: </span>
                  <code className="font-mono text-gray-700">
                    /{decodeURIComponent(orgSlug)}/agents/{formState.slug}
                  </code>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* キャラクター選択 */}
          <div className="space-y-2">
            <Label>キャラクター（性格・口調）</Label>
            <AgentPersonaSelector
              selectedPersonaId={formState.personaId || undefined}
              onPersonaChange={(id) => updateFormState({ personaId: id ?? "" })}
            />
            <p className="text-xs text-gray-500">
              AIのキャラクター（性格・口調）を選択します（任意）
            </p>
          </div>

          {/* システムプロンプト */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              システムプロンプト <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              placeholder="例: あなたは議事録作成の専門家です。会議の内容を整理し、重要なポイントをまとめてください。"
              value={formState.systemPrompt}
              onChange={(e) =>
                updateFormState({ systemPrompt: e.target.value })
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
                  <span className="text-xs">MCPなしでも保存可能</span>
                </>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Slack通知設定 */}
      <SlackNotificationSettings
        value={{
          enableSlackNotification: formState.enableSlackNotification,
          slackNotificationChannelId: formState.slackNotificationChannelId,
          slackNotificationChannelName: formState.slackNotificationChannelName,
          notifyOnlyOnFailure: formState.notifyOnlyOnFailure,
        }}
        onChange={updateFormState}
        isSlackConnected={slackConnectionStatus?.isConnected ?? false}
        channels={formattedSlackChannels}
      />

      {/* 保存ボタン */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid || updateMutation.isPending}
        className="w-full bg-gray-900 py-6 text-lg hover:bg-gray-800"
        size="lg"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            保存中...
          </>
        ) : (
          <>
            <Check className="mr-2 h-5 w-5" />
            変更を保存
          </>
        )}
      </Button>
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
  agentSlug,
}: EditAgentPageClientProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/${orgSlug}/agents/${agentSlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            詳細に戻る
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">エージェントを編集</h1>
        </div>
        <p className="mt-2 text-gray-600">
          システムプロンプトとMCPサーバーの設定を変更します
        </p>
      </div>

      <Suspense fallback={<EditFormSkeleton />}>
        <EditForm orgSlug={orgSlug} agentSlug={agentSlug} />
      </Suspense>
    </div>
  );
};
