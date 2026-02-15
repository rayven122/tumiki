"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, generateCUID } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";
import { McpServerVisibility } from "@tumiki/db/prisma";
import {
  Bot,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  ExternalLink,
  ImageIcon,
  Loader2,
  Lock,
  type LucideIcon,
  MoreHorizontal,
  Play,
  Timer,
  Trash2Icon,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ScheduleStatus } from "@tumiki/db/prisma";
import { CronExpressionParser } from "cron-parser";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { EntityIcon } from "@/components/ui/EntityIcon";
import { DeleteAgentModal } from "./DeleteAgentModal";
import { AgentIconEditModal } from "./AgentIconEditModal";
import { ExecutionResultModal } from "../[agentSlug]/_components/ExecutionResultModal";
import type { AgentId } from "@/schema/ids";
import { useExecutionTransport } from "@/features/chat/hooks/useExecutionTransport";

type Agent = RouterOutputs["agent"]["findAll"][number];

type AgentCardProps = {
  agent: Agent;
  revalidate?: () => Promise<void>;
  /** 稼働中の実行数（0の場合は稼働していない） */
  runningCount?: number;
};

// 可視性ごとの表示情報
type VisibilityInfo = {
  icon: LucideIcon;
  label: string;
  color: string;
};

const VISIBILITY_INFO_MAP: Record<McpServerVisibility, VisibilityInfo> = {
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

// アイコン一覧で表示する最大数
const MAX_VISIBLE_MCP_ICONS = 5;

/** スケジュールステータスサマリー */
const ScheduleStatusSummary = ({
  schedules,
}: {
  schedules: Agent["schedules"];
}) => {
  const total = schedules.length;

  if (total === 0) {
    return <span className="text-gray-400">なし</span>;
  }

  const activeCount = schedules.filter(
    (s) => s.status === ScheduleStatus.ACTIVE,
  ).length;

  if (activeCount === total) {
    return (
      <span>
        {total}件 <span className="text-green-600">(すべて有効)</span>
      </span>
    );
  }

  if (activeCount === 0) {
    return (
      <span>
        {total}件 <span className="text-gray-500">(すべて停止)</span>
      </span>
    );
  }

  const inactiveCount = total - activeCount;

  return (
    <span>
      {total}件 <span className="text-green-600">(有効{activeCount}</span>
      <span className="text-gray-500"> / 停止{inactiveCount})</span>
    </span>
  );
};

/** 作成者アバター */
const CreatorAvatar = ({ createdBy }: { createdBy: Agent["createdBy"] }) => {
  if (!createdBy) return null;

  // 名前の最初の2文字をイニシャルとして使用
  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    const words = name.split(" ");
    return words
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(createdBy.name);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {createdBy.image ? (
        <img
          src={createdBy.image}
          alt={createdBy.name ?? ""}
          className="h-5 w-5 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
          {initials}
        </div>
      )}
      <span>{createdBy.name}</span>
    </div>
  );
};

/** 最後の実行情報 */
const LastExecution = ({
  execution,
}: {
  execution?: Agent["executionLogs"][number];
}) => {
  if (!execution) {
    return <span className="text-gray-400">未実行</span>;
  }

  const timeAgo = formatDistanceToNow(new Date(execution.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  // success: true=成功, false=失敗, null=実行中または不明
  const getStatusIcon = () => {
    if (execution.success === true) {
      return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    }
    if (execution.success === false) {
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
    return <Clock className="h-3.5 w-3.5 text-gray-400" />;
  };

  return (
    <div className="flex items-center gap-1.5">
      {getStatusIcon()}
      <span className="text-gray-600">{timeAgo}</span>
    </div>
  );
};

/** LLMモデル名を短縮形で返す */
const formatModelName = (modelId: string | null): string => {
  if (!modelId) return "未設定";

  // よく使われるモデル名の短縮形マッピング
  const modelMapping: Record<string, string> = {
    "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku",
    "anthropic/claude-3.5-sonnet": "Claude 3.5 Sonnet",
    "anthropic/claude-3-opus": "Claude 3 Opus",
    "openai/gpt-4o": "GPT-4o",
    "openai/gpt-4o-mini": "GPT-4o mini",
    "openai/gpt-4-turbo": "GPT-4 Turbo",
    "google/gemini-pro": "Gemini Pro",
    "google/gemini-1.5-pro": "Gemini 1.5 Pro",
  };

  return modelMapping[modelId] ?? modelId.split("/").pop() ?? modelId;
};

/** ミリ秒を読みやすい形式に変換 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) return "1秒未満";
  if (ms < 60000) return `約${Math.round(ms / 1000)}秒`;
  if (ms < 3600000) return `約${Math.round(ms / 60000)}分`;
  return `約${Math.round(ms / 3600000)}時間`;
};

/** 成功率を計算 */
const calculateSuccessRate = (
  executionLogs: Agent["executionLogs"],
): { rate: number; total: number; success: number } | null => {
  const completedLogs = executionLogs.filter((log) => log.success !== null);
  if (completedLogs.length === 0) return null;

  const successCount = completedLogs.filter(
    (log) => log.success === true,
  ).length;
  const rate = Math.round((successCount / completedLogs.length) * 100);

  return { rate, total: completedLogs.length, success: successCount };
};

/** 成功率に応じた色クラスを取得 */
const getSuccessRateColorClass = (rate: number): string => {
  if (rate >= 80) return "text-green-500";
  if (rate >= 50) return "text-yellow-500";
  return "text-red-500";
};

/** 利用可能なツール数を計算 */
const calculateTotalTools = (mcpServers: Agent["mcpServers"]): number => {
  return mcpServers.reduce((total, server) => {
    const toolCount =
      server.templateInstances?.reduce(
        (sum, instance) =>
          sum + (instance.mcpServerTemplate?._count?.mcpTools ?? 0),
        0,
      ) ?? 0;
    return total + toolCount;
  }, 0);
};

/** 次回スケジュール実行時刻を取得 */
const getNextScheduleTime = (
  schedules: Agent["schedules"],
): { time: Date; name: string } | null => {
  const activeSchedules = schedules.filter(
    (s) => s.status === ScheduleStatus.ACTIVE,
  );
  if (activeSchedules.length === 0) return null;

  let earliest: { time: Date; name: string } | null = null;

  for (const schedule of activeSchedules) {
    try {
      const interval = CronExpressionParser.parse(schedule.cronExpression, {
        tz: schedule.timezone,
      });
      const nextTime = interval.next().toDate();

      if (!earliest || nextTime < earliest.time) {
        earliest = { time: nextTime, name: schedule.name };
      }
    } catch {
      // cron式のパースに失敗した場合はスキップ
    }
  }

  return earliest;
};

/** 稼働中インジケーター */
const RunningIndicator = ({ count }: { count: number }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-700">稼働中</span>
          {count > 1 && (
            <span className="text-xs text-green-600">×{count}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{count}件の実行が進行中です</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/**
 * エージェントカードコンポーネント
 */
export const AgentCard = ({
  agent,
  revalidate,
  runningCount = 0,
}: AgentCardProps) => {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const orgSlug = params.orgSlug;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [iconEditModalOpen, setIconEditModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [executionError, setExecutionError] = useState<string | undefined>();

  const utils = api.useUtils();

  const mcpServerCount = agent.mcpServers.length;

  // prepareSendMessagesRequest をメモ化
  const prepareSendMessagesRequest = useMemo(
    () =>
      (request: { messages: UIMessage[]; body?: Record<string, unknown> }) => {
        const lastMessage = request.messages.at(-1);
        const userText =
          lastMessage?.parts?.find(
            (p): p is { type: "text"; text: string } => p.type === "text",
          )?.text ?? "タスクを実行してください。";

        return {
          body: {
            organizationId: agent.organizationId,
            message: userText,
            ...request.body,
          },
        };
      },
    [agent.organizationId],
  );

  // 共通トランスポートを使用
  const { transport, isSessionReady } = useExecutionTransport({
    apiPath: `/agent/${agent.id}`,
    prepareSendMessagesRequest,
  });

  // ストリーミング用のuseChat
  const { messages, status, sendMessage, setMessages } = useChat({
    id: `agent-card-execution-${agent.id}`,
    generateId: generateCUID,
    transport,
    onError: (error) => {
      setExecutionError(error.message);
    },
    onFinish: () => {
      void utils.agent.findAll.invalidate();
      void utils.agentExecution.getAllRunning.invalidate();
      void revalidate?.();
    },
  });

  const isStreaming = status === "streaming";

  const handleExecute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setMessages([]);
      setExecutionError(undefined);
      setResultModalOpen(true);

      // 実行開始時にキャッシュをインバリデート（稼働中表示の更新）
      void utils.agentExecution.getAllRunning.invalidate();

      void sendMessage({
        role: "user",
        parts: [{ type: "text", text: "タスクを実行してください。" }],
      });
    },
    [sendMessage, setMessages, utils],
  );

  const handleCardClick = useCallback(() => {
    router.push(`/${orgSlug}/agents/${agent.slug}`);
  }, [router, orgSlug, agent.slug]);

  const visibilityInfo = VISIBILITY_INFO_MAP[agent.visibility];
  const VisibilityIcon = visibilityInfo.icon;

  // パフォーマンス最適化: 表示するサーバー一覧をメモ化
  const visibleServers = useMemo(
    () => agent.mcpServers.slice(0, MAX_VISIBLE_MCP_ICONS),
    [agent.mcpServers],
  );

  return (
    <>
      <Card
        className={cn(
          "relative flex h-full flex-col transition-all duration-200",
          "cursor-pointer hover:-translate-y-1 hover:bg-gray-50/50 hover:shadow-lg",
          runningCount > 0 && "border-green-300 bg-green-50/30",
        )}
        onClick={handleCardClick}
      >
        {/* 稼働中インジケーター */}
        {runningCount > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <RunningIndicator count={runningCount} />
          </div>
        )}

        {/* 右上のメニュー */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* 可視性アイコン */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full bg-gray-100",
                    visibilityInfo.color,
                  )}
                >
                  <VisibilityIcon className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{visibilityInfo.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* メニューボタン */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">メニューを開く</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleExecute}
                disabled={isStreaming || !isSessionReady}
              >
                {isStreaming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                今すぐ実行
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${orgSlug}/agents/${agent.slug}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  詳細を見る
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIconEditModalOpen(true);
                }}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                アイコンを変更
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${orgSlug}/agents/${agent.slug}/edit`}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  編集
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModalOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          {/* アイコン */}
          <div className="mr-3">
            <EntityIcon
              iconPath={agent.iconPath}
              alt={agent.name}
              type="agent"
            />
          </div>
          <div className="min-w-0 flex-1 pr-20">
            <CardTitle className="truncate text-lg">{agent.name}</CardTitle>
            {agent.description && (
              <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                {agent.description}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {/* LLMモデルと推定実行時間 */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Bot className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-gray-700">
                {formatModelName(agent.modelId)}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Timer className="h-4 w-4" />
              <span>{formatDuration(agent.estimatedDurationMs)}</span>
            </div>
          </div>

          {/* 利用可能なツール数 */}
          {(() => {
            const toolCount = calculateTotalTools(agent.mcpServers);
            return toolCount > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    利用可能なツール
                  </span>
                </div>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-sm font-medium text-blue-700">
                  {toolCount}
                </span>
              </div>
            ) : null;
          })()}

          {/* MCPサーバーアイコン一覧 */}
          {mcpServerCount > 0 && (
            <div className="flex items-center gap-1">
              {visibleServers.map((server) => {
                const templateIconPath =
                  server.templateInstances?.[0]?.mcpServerTemplate?.iconPath;
                const iconPath = server.iconPath ?? templateIconPath ?? null;

                return (
                  <TooltipProvider key={server.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <EntityIcon
                          iconPath={iconPath}
                          type="mcp"
                          size="sm"
                          alt={server.name}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{server.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {mcpServerCount > MAX_VISIBLE_MCP_ICONS && (
                <Badge variant="secondary" className="ml-1">
                  +{mcpServerCount - MAX_VISIBLE_MCP_ICONS}
                </Badge>
              )}
            </div>
          )}

          {/* 実行統計と次回スケジュール */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {/* 成功率 */}
            {(() => {
              const stats = calculateSuccessRate(agent.executionLogs);
              return stats ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp
                          className={cn(
                            "h-4 w-4",
                            getSuccessRateColorClass(stats.rate),
                          )}
                        />
                        <span className="text-gray-600">
                          成功率: {stats.rate}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        直近{stats.total}回中 {stats.success}回成功
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null;
            })()}

            {/* 最後の実行 */}
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>最終実行:</span>
              <LastExecution execution={agent.executionLogs[0]} />
            </div>

            {/* 次回スケジュール */}
            {(() => {
              const next = getNextScheduleTime(agent.schedules);
              return next ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span>
                          次回: {format(next.time, "M/d HH:mm", { locale: ja })}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{next.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <ScheduleStatusSummary schedules={agent.schedules} />
                </div>
              );
            })()}
          </div>

          {/* 作成者情報 */}
          {agent.createdBy && (
            <div className="border-t border-gray-100 pt-2">
              <CreatorAvatar createdBy={agent.createdBy} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 削除確認モーダル */}
      {deleteModalOpen && (
        <DeleteAgentModal
          open={deleteModalOpen}
          agentId={agent.id}
          agentName={agent.name}
          onOpenChange={setDeleteModalOpen}
          onSuccess={async () => {
            await revalidate?.();
            setDeleteModalOpen(false);
          }}
        />
      )}

      {/* アイコン編集モーダル */}
      {iconEditModalOpen && (
        <AgentIconEditModal
          agentId={agent.id as AgentId}
          initialIconPath={agent.iconPath}
          orgSlug={orgSlug}
          onOpenChange={setIconEditModalOpen}
          onSuccess={async () => {
            await revalidate?.();
          }}
        />
      )}

      {/* 実行結果モーダル */}
      <ExecutionResultModal
        open={resultModalOpen}
        onOpenChange={setResultModalOpen}
        agentId={agent.id as AgentId}
        messages={messages}
        isStreaming={isStreaming}
        error={executionError}
        agentEnableSlackNotification={agent.enableSlackNotification}
      />
    </>
  );
};
