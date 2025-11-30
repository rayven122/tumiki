"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import {
  Trash2Icon,
  ImageIcon,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Wrench,
  Edit2,
} from "lucide-react";
import { ToolsModal } from "../ServerCard/ToolsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { NameEditModal } from "./NameEditModal";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { getProxyServerUrl } from "@/utils/url";
import { toast } from "@/utils/client/toast";
import { cn } from "@/lib/utils";

import { type RouterOutputs, api } from "@/trpc/react";
import { SERVER_STATUS_LABELS } from "@/constants/userMcpServer";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { FaviconImage } from "@/components/ui/FaviconImage";

type ServerInstance =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"][number];

type UserMcpServerCardProps = {
  serverInstance: ServerInstance;
  revalidate?: () => Promise<void>;
  isSortMode?: boolean;
};

export const UserMcpServerCard = ({
  serverInstance,
  revalidate,
  isSortMode = false,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nameEditModalOpen, setNameEditModalOpen] = useState(false);

  const { tools } = serverInstance;

  const apiKey = serverInstance.apiKeys[0]?.apiKey ?? "";

  const { mutate: updateStatus, isPending: isStatusUpdating } =
    api.userMcpServerInstance.updateServerStatus.useMutation({
      onSuccess: async () => {
        toast.success("サーバーステータスを更新しました");
        await revalidate?.();
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const copyHttpUrl = async () => {
    const url = `${getProxyServerUrl()}/mcp?api-key=${apiKey}`;
    await copyToClipboard(url);
    toast.success("HTTP接続URLをコピーしました");
  };

  // MCPサーバーのURLを取得（ファビコン表示用）
  const mcpServerUrl = serverInstance.mcpServer?.url;

  // 説明の優先順位: 1. インスタンスの説明 2. MCPサーバーの説明
  const displayDescription =
    serverInstance.description ?? serverInstance.mcpServer?.description ?? "";

  const displayTags = serverInstance.mcpServer?.tags ?? [];

  const handleCardClick = () => {
    if (isSortMode) return; // ソートモード時はクリック無効
    window.location.href = `/mcp/${serverInstance.serverType === ServerType.OFFICIAL ? "servers" : "custom-servers"}/${serverInstance.id}`;
  };

  return (
    <>
      <Card
        className={cn(
          "relative flex h-full flex-col transition-all duration-200",
          !isSortMode &&
            "cursor-pointer hover:-translate-y-1 hover:bg-gray-50/50 hover:shadow-lg",
          isSortMode &&
            "cursor-grab border-2 border-dashed border-blue-300 bg-blue-50/30 select-none",
        )}
        onClick={handleCardClick}
      >
        {/* メニュー（右上） */}
        {!isSortMode && (
          <div className="absolute top-3 right-3 z-10">
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
                  <Link
                    href={`/mcp/${serverInstance.serverType === ServerType.OFFICIAL ? "servers" : "custom-servers"}/${serverInstance.id}`}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    詳細を見る
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setNameEditModalOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  名前を編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyHttpUrl();
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  接続URLをコピー
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    void updateStatus({
                      id: serverInstance.id,
                      serverStatus:
                        serverInstance.serverStatus === ServerStatus.RUNNING
                          ? ServerStatus.STOPPED
                          : ServerStatus.RUNNING,
                    });
                  }}
                  disabled={isStatusUpdating}
                >
                  {serverInstance.serverStatus === ServerStatus.RUNNING ? (
                    <>
                      <span className="mr-2 h-4 w-4">⏸</span>
                      停止
                    </>
                  ) : (
                    <>
                      <span className="mr-2 h-4 w-4">▶</span>
                      起動
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModalOpen(true);
                  }}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <CardHeader className="flex flex-row items-center space-y-0 pt-3 pr-2 pb-2">
          <div className="mr-2 rounded-md p-2">
            {serverInstance.iconPath || serverInstance.mcpServer?.iconPath ? (
              <Image
                src={
                  serverInstance.iconPath ??
                  serverInstance.mcpServer?.iconPath ??
                  "/placeholder.svg"
                }
                alt={serverInstance.name}
                width={32}
                height={32}
              />
            ) : (
              <FaviconImage
                url={mcpServerUrl}
                alt={serverInstance.name}
                size={32}
                fallback={
                  <div className="flex size-8 items-center justify-center rounded-md bg-gray-200">
                    <ImageIcon className="size-4 text-gray-500" />
                  </div>
                }
              />
            )}
          </div>
          <div className="flex-1">
            <CardTitle>{serverInstance.name}</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    serverInstance.serverStatus === ServerStatus.RUNNING
                      ? "bg-green-500"
                      : serverInstance.serverStatus === ServerStatus.STOPPED
                        ? "bg-gray-500"
                        : serverInstance.serverStatus === ServerStatus.PENDING
                          ? "bg-yellow-500"
                          : "bg-red-500",
                  )}
                />
                <span className="text-xs text-gray-600">
                  {SERVER_STATUS_LABELS[serverInstance.serverStatus]}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {/* ツール一覧を表示するボタン */}
          <Button
            variant="outline"
            size="sm"
            className="flex w-full items-center justify-between"
            onClick={(e) => {
              e.stopPropagation();
              setToolsModalOpen(true);
            }}
          >
            <span className="flex items-center">
              <Wrench className="mr-2 size-4" />
              利用可能なツール
            </span>
            <Badge variant="secondary" className="ml-2">
              {tools.length}
            </Badge>
          </Button>

          {/* MCPサーバーの概要 */}
          <div>
            <p className="text-sm leading-relaxed text-gray-600">
              {displayDescription}
            </p>
          </div>

          {/* カテゴリータグ（カード下部） */}
          <div className="flex flex-wrap gap-1 pt-2">
            {displayTags.map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: "#6B46C1" }}
                onClick={(e) => e.stopPropagation()}
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={serverInstance.name}
        tools={[]} // 簡素化されたデータ構造では詳細なツール情報は利用できない
      />

      {/* 削除確認モーダル */}
      {deleteModalOpen && (
        <DeleteConfirmModal
          open={deleteModalOpen}
          serverInstanceId={serverInstance.id}
          serverName={serverInstance.name}
          onOpenChange={setDeleteModalOpen}
          onSuccess={async () => {
            await revalidate?.();
            setDeleteModalOpen(false);
          }}
        />
      )}

      {/* 名前編集モーダル */}
      {nameEditModalOpen && (
        <NameEditModal
          serverInstanceId={serverInstance.id}
          initialName={serverInstance.name}
          initialDescription={serverInstance.description}
          onSuccess={async () => {
            await revalidate?.();
            setNameEditModalOpen(false);
          }}
          onOpenChange={setNameEditModalOpen}
        />
      )}
    </>
  );
};
