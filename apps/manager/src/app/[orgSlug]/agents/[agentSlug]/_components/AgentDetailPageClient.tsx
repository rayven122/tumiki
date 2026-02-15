"use client";

import { Suspense, useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Edit2,
  Server,
  Calendar,
  Activity,
  Lock,
  Building2,
  Trash2,
  Play,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  ImageIcon,
  Bell,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { McpServerVisibility } from "@tumiki/db/prisma";
import type { AgentId } from "@/schema/ids";

import { EntityIcon } from "@/components/ui/EntityIcon";
import { DeleteAgentModal } from "../../_components/DeleteAgentModal";
import { AgentIconEditModal } from "../../_components/AgentIconEditModal";
import { useAgentExecution } from "../_hooks";
import { ExecutionHistory } from "./ExecutionHistory";
import { ExecutionResultModal } from "./ExecutionResultModal";
import { ScheduleForm } from "./ScheduleForm";
import { ScheduleList } from "./ScheduleList";

type AgentDetailPageClientProps = {
  orgSlug: string;
  agentSlug: string;
};

/** 公開範囲ごとの表示情報 */
const VISIBILITY_INFO: Record<
  McpServerVisibility,
  { icon: LucideIcon; label: string }
> = {
  [McpServerVisibility.PRIVATE]: {
    icon: Lock,
    label: "自分のみ",
  },
  [McpServerVisibility.ORGANIZATION]: {
    icon: Building2,
    label: "組織内",
  },
  [McpServerVisibility.PUBLIC]: {
    icon: Building2,
    label: "公開",
  },
};

/** Slack通知状態の判定 */
type SlackNotificationStatus = "enabled" | "channel-missing" | "disabled";

const getSlackNotificationStatus = (agent: {
  enableSlackNotification: boolean;
  slackNotificationChannelId: string | null;
}): SlackNotificationStatus => {
  if (!agent.enableSlackNotification) {
    return "disabled";
  }
  if (!agent.slackNotificationChannelId) {
    return "channel-missing";
  }
  return "enabled";
};

/** Slack通知状態バッジ */
const SlackNotificationBadge = ({
  status,
  channelName,
}: {
  status: SlackNotificationStatus;
  channelName?: string | null;
}) => {
  switch (status) {
    case "enabled":
      return (
        <Badge
          variant="outline"
          className="border-green-300 bg-green-50 text-green-700"
        >
          <Bell className="mr-1 h-3 w-3" />
          Slack通知: #{channelName ?? "有効"}
        </Badge>
      );
    case "channel-missing":
      return (
        <Badge
          variant="outline"
          className="border-yellow-300 bg-yellow-50 text-yellow-700"
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          Slack通知: チャンネル未設定
        </Badge>
      );
    case "disabled":
      // 無効の場合は何も表示しない
      return null;
  }
};

const AsyncAgentDetail = ({
  orgSlug,
  agentSlug,
}: AgentDetailPageClientProps) => {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [iconEditModalOpen, setIconEditModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const utils = api.useUtils();

  // スラグでエージェント情報を取得
  const [agent] = api.agent.findBySlug.useSuspenseQuery({
    slug: agentSlug,
  });

  // エージェント実行フック
  const {
    messages,
    isStreaming,
    executionError,
    isSessionReady,
    handleExecute: executeAgent,
  } = useAgentExecution({
    agentId: agent.id as AgentId,
    organizationId: agent.organizationId,
    onExecutionComplete: () => {
      // 実行完了後にエージェント情報と実行履歴を再取得
      void utils.agent.findBySlug.invalidate({ slug: agentSlug });
      void utils.agentExecution.findByAgentId.invalidate({
        agentId: agent.id as AgentId,
      });
    },
  });

  // 実行ボタンのハンドラ（モーダルを開いてから実行）
  const handleExecute = useCallback(() => {
    setResultModalOpen(true);
    executeAgent();
  }, [executeAgent]);

  const visibilityInfo = VISIBILITY_INFO[agent.visibility];
  const VisibilityIcon = visibilityInfo.icon;
  const slackNotificationStatus = getSlackNotificationStatus(agent);

  const handleDeleteSuccess = () => {
    void utils.agent.findAll.invalidate();
    router.push(`/${orgSlug}/agents`);
  };

  // 実行履歴の再取得
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const handleRefreshHistory = useCallback(async () => {
    setIsRefreshingHistory(true);
    try {
      await utils.agentExecution.findByAgentId.invalidate({
        agentId: agent.id as AgentId,
      });
    } finally {
      setIsRefreshingHistory(false);
    }
  }, [utils.agentExecution.findByAgentId, agent.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <EntityIcon
                iconPath={agent.iconPath}
                alt={agent.name}
                type="agent"
              />
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                {agent.description && (
                  <p className="mt-1 text-gray-600">{agent.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <VisibilityIcon className="h-4 w-4" />
                    <span>{visibilityInfo.label}</span>
                  </div>
                  {agent.modelId && (
                    <Badge variant="outline">{agent.modelId}</Badge>
                  )}
                  <SlackNotificationBadge
                    status={slackNotificationStatus}
                    channelName={agent.slackNotificationChannelName}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleExecute}
                disabled={isStreaming || !isSessionReady}
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    実行中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    今すぐ実行
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">メニューを開く</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIconEditModalOpen(true)}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    アイコンを変更
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${orgSlug}/agents/${agentSlug}/edit`}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      編集
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteModalOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agent.schedules.length}</p>
              <p className="text-sm text-gray-500">スケジュール</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agent.executionLogs.length}</p>
              <p className="text-sm text-gray-500">最近の実行</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>システムプロンプト</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-gray-50 p-4 font-mono text-sm whitespace-pre-wrap text-gray-700">
            {agent.systemPrompt}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            MCPサーバー
            <Badge variant="secondary">{agent.mcpServers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agent.mcpServers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {agent.mcpServers.map((server) => {
                const firstTemplateInstance = server.templateInstances?.[0];
                const iconPath =
                  server.iconPath ??
                  firstTemplateInstance?.mcpServerTemplate?.iconPath ??
                  null;

                return (
                  <Link
                    key={server.id}
                    href={`/${orgSlug}/mcps/${server.slug}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <EntityIcon
                      iconPath={iconPath}
                      type="mcp"
                      size="sm"
                      alt={server.name}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{server.name}</p>
                      {server.description && (
                        <p className="line-clamp-1 text-sm text-gray-500">
                          {server.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              MCPサーバーが紐づけられていません
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            スケジュール
            <Badge variant="secondary">{agent.schedules.length}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleFormOpen(true)}
          >
            スケジュール追加
          </Button>
        </CardHeader>
        <CardContent>
          <ScheduleList agentId={agent.id as AgentId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            最近の実行履歴
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshHistory}
                disabled={isRefreshingHistory}
                className="h-8 w-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshingHistory ? "animate-spin" : ""}`}
                />
                <span className="sr-only">更新</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>履歴を更新</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <ExecutionHistory agentId={agent.id as AgentId} orgSlug={orgSlug} />
        </CardContent>
      </Card>

      {deleteModalOpen && (
        <DeleteAgentModal
          open={deleteModalOpen}
          agentId={agent.id}
          agentName={agent.name}
          onOpenChange={setDeleteModalOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {iconEditModalOpen && (
        <AgentIconEditModal
          agentId={agent.id as AgentId}
          initialIconPath={agent.iconPath}
          orgSlug={orgSlug}
          onOpenChange={setIconEditModalOpen}
          onSuccess={async () => {
            await utils.agent.findBySlug.invalidate({ slug: agentSlug });
          }}
        />
      )}

      {/* 実行結果モーダル（ストリーミング対応） */}
      <ExecutionResultModal
        open={resultModalOpen}
        onOpenChange={setResultModalOpen}
        messages={messages}
        isStreaming={isStreaming}
        error={executionError}
        agentEnableSlackNotification={agent.enableSlackNotification}
        agentSlackChannelName={agent.slackNotificationChannelName}
      />

      {/* スケジュール作成モーダル */}
      <ScheduleForm
        agentId={agent.id as AgentId}
        isOpen={scheduleFormOpen}
        onClose={() => setScheduleFormOpen(false)}
      />
    </div>
  );
};

// 統計カードの数（スケジュール、最近の実行）
const STATS_CARD_COUNT = 2;

const AgentDetailSkeleton = () => (
  <div className="space-y-6">
    <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: STATS_CARD_COUNT }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="h-24 animate-pulse rounded-lg bg-gray-200"
        />
      ))}
    </div>
    <div className="h-48 animate-pulse rounded-lg bg-gray-200" />
  </div>
);

export const AgentDetailPageClient = ({
  orgSlug,
  agentSlug,
}: AgentDetailPageClientProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/${orgSlug}/agents`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          エージェント一覧に戻る
        </Link>
      </Button>

      <Suspense fallback={<AgentDetailSkeleton />}>
        <AsyncAgentDetail orgSlug={orgSlug} agentSlug={agentSlug} />
      </Suspense>
    </div>
  );
};
