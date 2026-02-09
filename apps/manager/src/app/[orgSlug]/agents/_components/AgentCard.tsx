"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";
import { McpServerVisibility } from "@tumiki/db/prisma";
import {
  Activity,
  Bot,
  Building2,
  Calendar,
  Edit2,
  ExternalLink,
  ImageIcon,
  Lock,
  type LucideIcon,
  MoreHorizontal,
  Server,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { McpServerIcon } from "../../mcps/_components/McpServerIcon";
import { DeleteAgentModal } from "./DeleteAgentModal";
import { AgentIconEditModal } from "./AgentIconEditModal";
import type { AgentId } from "@/schema/ids";

type Agent = RouterOutputs["v2"]["agent"]["findAll"][number];

type AgentCardProps = {
  agent: Agent;
  revalidate?: () => Promise<void>;
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

/**
 * エージェントカードコンポーネント
 */
export const AgentCard = ({ agent, revalidate }: AgentCardProps) => {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const orgSlug = params.orgSlug;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [iconEditModalOpen, setIconEditModalOpen] = useState(false);

  const mcpServerCount = agent.mcpServers.length;
  const scheduleCount = agent.schedules.length;
  const executionCount = agent._count.executionLogs;

  const handleCardClick = () => {
    router.push(`/${orgSlug}/agents/${agent.id}`);
  };

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
        )}
        onClick={handleCardClick}
      >
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
              <DropdownMenuItem asChild>
                <Link href={`/${orgSlug}/agents/${agent.id}`}>
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
                <Link href={`/${orgSlug}/agents/${agent.id}/edit`}>
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
          <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
            {agent.iconPath ? (
              <McpServerIcon
                iconPath={agent.iconPath}
                alt={agent.name}
                size={28}
              />
            ) : (
              <Bot className="h-7 w-7 text-purple-600" />
            )}
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
          {/* 統計情報 */}
          <div className="flex flex-wrap gap-3">
            {/* MCPサーバー数 */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Server className="h-4 w-4" />
              <span>MCP: {mcpServerCount}</span>
            </div>

            {/* スケジュール数 */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>スケジュール: {scheduleCount}</span>
            </div>

            {/* 実行回数 */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Activity className="h-4 w-4" />
              <span>実行: {executionCount}</span>
            </div>
          </div>

          {/* MCPサーバーアイコン一覧 */}
          {mcpServerCount > 0 && (
            <div className="flex items-center gap-1 pt-2">
              {visibleServers.map((server) => (
                <TooltipProvider key={server.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
                        <McpServerIcon
                          iconPath={server.iconPath}
                          alt={server.name}
                          size={20}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{server.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {mcpServerCount > MAX_VISIBLE_MCP_ICONS && (
                <Badge variant="secondary" className="ml-1">
                  +{mcpServerCount - MAX_VISIBLE_MCP_ICONS}
                </Badge>
              )}
            </div>
          )}

          {/* 作成者情報 */}
          {agent.createdBy && (
            <div className="flex items-center gap-2 pt-2 text-xs text-gray-500">
              {agent.createdBy.image && (
                <img
                  src={agent.createdBy.image}
                  alt={agent.createdBy.name ?? ""}
                  className="h-5 w-5 rounded-full"
                />
              )}
              <span>{agent.createdBy.name}</span>
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
    </>
  );
};
