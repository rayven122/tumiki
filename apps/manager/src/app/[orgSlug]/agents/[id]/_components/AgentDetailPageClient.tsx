"use client";

import { Suspense } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Bot,
  Edit2,
  Server,
  Calendar,
  Activity,
  Lock,
  Building2,
  Clock,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { McpServerVisibility, ScheduleStatus } from "@tumiki/db/prisma";
import type { AgentId } from "@/schema/ids";

import { McpServerIcon } from "../../../mcps/_components/McpServerIcon";
import { DeleteAgentModal } from "../../_components/DeleteAgentModal";
import { ExecutionHistory } from "../schedule/_components/ExecutionHistory";

type AgentDetailPageClientProps = {
  orgSlug: string;
  agentId: string;
};

// 可視性情報
const VISIBILITY_INFO = {
  [McpServerVisibility.PRIVATE]: {
    icon: Lock,
    label: "自分のみ",
    color: "text-gray-500",
  },
  [McpServerVisibility.ORGANIZATION]: {
    icon: Building2,
    label: "組織内",
    color: "text-blue-500",
  },
  [McpServerVisibility.PUBLIC]: {
    icon: Building2,
    label: "公開",
    color: "text-green-500",
  },
};

// スケジュールステータス
const SCHEDULE_STATUS_INFO = {
  [ScheduleStatus.ACTIVE]: {
    label: "有効",
    color: "bg-green-100 text-green-700",
  },
  [ScheduleStatus.PAUSED]: {
    label: "一時停止",
    color: "bg-yellow-100 text-yellow-700",
  },
  [ScheduleStatus.DISABLED]: {
    label: "無効",
    color: "bg-gray-100 text-gray-700",
  },
};

/**
 * エージェント詳細の非同期コンポーネント
 */
const AsyncAgentDetail = ({ orgSlug, agentId }: AgentDetailPageClientProps) => {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const utils = api.useUtils();

  const [agent] = api.v2.agent.findById.useSuspenseQuery({
    id: agentId as AgentId,
  });

  const visibilityInfo = VISIBILITY_INFO[agent.visibility];
  const VisibilityIcon = visibilityInfo.icon;

  const handleDeleteSuccess = async () => {
    await utils.v2.agent.findAll.invalidate();
    router.push(`/${orgSlug}/agents`);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダーカード */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-100">
                {agent.iconPath ? (
                  <McpServerIcon
                    iconPath={agent.iconPath}
                    alt={agent.name}
                    size={36}
                  />
                ) : (
                  <Bot className="h-9 w-9 text-purple-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                {agent.description && (
                  <p className="mt-1 text-gray-600">{agent.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <VisibilityIcon className="h-4 w-4" />
                    <span>{visibilityInfo.label}</span>
                  </div>
                  {agent.modelId && (
                    <Badge variant="outline">{agent.modelId}</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/${orgSlug}/agents/${agentId}/edit`}>
                <Edit2 className="mr-2 h-4 w-4" />
                編集
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Server className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agent.mcpServers.length}</p>
              <p className="text-sm text-gray-500">MCPサーバー</p>
            </div>
          </CardContent>
        </Card>
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

      {/* システムプロンプト */}
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

      {/* MCPサーバー一覧 */}
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
              {agent.mcpServers.map((server) => (
                <Link
                  key={server.id}
                  href={`/${orgSlug}/mcps/${server.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <McpServerIcon
                      iconPath={server.iconPath}
                      alt={server.name}
                      size={24}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{server.name}</p>
                    {server.description && (
                      <p className="line-clamp-1 text-sm text-gray-500">
                        {server.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              MCPサーバーが紐づけられていません
            </div>
          )}
        </CardContent>
      </Card>

      {/* スケジュール一覧 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            スケジュール
            <Badge variant="secondary">{agent.schedules.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/agents/${agentId}/schedule`}>
              スケジュール設定
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {agent.schedules.length > 0 ? (
            <div className="space-y-3">
              {agent.schedules.map((schedule) => {
                const statusInfo = SCHEDULE_STATUS_INFO[schedule.status];
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="font-mono text-sm text-gray-500">
                          {schedule.cronExpression}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              スケジュールが設定されていません
            </div>
          )}
        </CardContent>
      </Card>

      {/* 実行履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            最近の実行履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionHistory agentId={agent.id as AgentId} />
        </CardContent>
      </Card>

      {/* 危険ゾーン */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">危険な操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">エージェントを削除</p>
              <p className="text-sm text-gray-500">
                関連するスケジュールと実行履歴も削除されます
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 削除モーダル */}
      {deleteModalOpen && (
        <DeleteAgentModal
          open={deleteModalOpen}
          agentId={agent.id}
          agentName={agent.name}
          onOpenChange={setDeleteModalOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

// 統計カードの定義から数を自動計算
const STATS_CARDS = ["mcpServers", "schedules", "executionLogs"] as const;
const STATS_CARD_COUNT = STATS_CARDS.length;

/**
 * スケルトンローダー
 */
const AgentDetailSkeleton = () => (
  <div className="space-y-6">
    <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

/**
 * エージェント詳細ページのクライアントコンポーネント
 */
export const AgentDetailPageClient = ({
  orgSlug,
  agentId,
}: AgentDetailPageClientProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 戻るリンク */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/${orgSlug}/agents`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          エージェント一覧に戻る
        </Link>
      </Button>

      <Suspense fallback={<AgentDetailSkeleton />}>
        <AsyncAgentDetail orgSlug={orgSlug} agentId={agentId} />
      </Suspense>
    </div>
  );
};
