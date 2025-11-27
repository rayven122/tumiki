"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import {
  Trash2Icon,
  ImageIcon,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Wrench,
  RefreshCw,
  Edit2,
} from "lucide-react";
import { ToolsModal } from "../modals/ToolsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { ImageEditModal } from "./ImageEditModal";
import { NameEditModal } from "./NameEditModal";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import {
  getProxyServerUrl,
  makeSseProxyServerUrl,
  makeHttpProxyServerUrl,
} from "@/utils/url";
import { toast } from "@/utils/client/toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { debounce } from "@/utils/debounce";

import { type RouterOutputs, api } from "@/trpc/react";
import { SERVER_STATUS_LABELS } from "@/constants/userMcpServer";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { FaviconImage } from "@/components/ui/FaviconImage";
import { getMcpServerData } from "@/constants/mcpServerDescriptions";

type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findOfficialServers"][number];

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
  // const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false);
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

  const { mutate: scanServer, isPending: isScanning } =
    api.userMcpServerInstance.checkServerConnection.useMutation({
      onSuccess: async (result) => {
        if (result.success) {
          toast.success(`接続が正常です（ツール数: ${result.toolCount}）`);
        } else {
          toast.error(result.error ?? "接続に失敗しました");
        }
        await revalidate?.();
      },
      onError: (error) => {
        toast.error(`スキャンエラー: ${error.message}`);
      },
    });

  // デバウンスされたスキャン関数を作成
  const debouncedScan = useMemo(
    () =>
      debounce(() => {
        // 既に実行中の場合はスキップ
        if (isScanning) return;

        scanServer({
          serverInstanceId: serverInstance.id,
          updateStatus: false,
        });
      }, 1000), // 1秒のデバウンス
    [serverInstance.id, scanServer, isScanning],
  );

  const handleScan = () => {
    debouncedScan();
  };

  // userMcpServersが削除されたため、プリフェッチクエリは不要

  const copyUrl = async () => {
    const url = `${getProxyServerUrl()}/sse?api-key=${apiKey}`;
    await copyToClipboard(url);
    toast.success("SSE接続URLをコピーしました");
  };

  const copyHttpUrl = async () => {
    const url = `${getProxyServerUrl()}/mcp?api-key=${apiKey}`;
    await copyToClipboard(url);
    toast.success("HTTP接続URLをコピーしました");
  };

  const handleStatusToggle = (checked: boolean) => {
    const newStatus = checked ? ServerStatus.RUNNING : ServerStatus.STOPPED;
    updateStatus({
      id: serverInstance.id,
      serverStatus: newStatus,
    });
  };

  // MCPサーバーのURLを取得（ファビコン表示用）
  const mcpServerUrl = serverInstance.mcpServer?.url;

  // MCPサーバーからdescriptionとtagsを取得、空の場合はモックデータを使用
  const mcpDescription = serverInstance.mcpServer?.description;
  const mcpTags = serverInstance.mcpServer?.tags;

  const hasMcpDescription = mcpDescription && mcpDescription.trim() !== "";
  const hasMcpTags = mcpTags && mcpTags.length > 0;

  // MCPサーバーにデータがない場合のみモックデータを使用
  const mockData =
    !hasMcpDescription || !hasMcpTags
      ? getMcpServerData(serverInstance.name)
      : null;

  // 説明の優先順位: 1. インスタンスの説明 2. MCPサーバーの説明 3. モックデータ
  const displayDescription =
    serverInstance.description && serverInstance.description.trim() !== ""
      ? serverInstance.description
      : hasMcpDescription
        ? mcpDescription
        : (mockData?.description ?? "");

  const displayTags = hasMcpTags ? mcpTags : (mockData?.tags ?? []);

  const handleCardClick = () => {
    if (isSortMode) return; // ソートモード時はクリック無効
    window.location.href = `/mcp/${serverInstance.serverType === ServerType.OFFICIAL ? "servers" : "custom-servers"}/${serverInstance.id}`;
  };

  return (
    <>
      <Card
        className={cn(
          "flex h-full flex-col transition-all duration-200",
          !isSortMode &&
            "cursor-pointer hover:-translate-y-1 hover:bg-gray-50/50 hover:shadow-lg",
          isSortMode &&
            "cursor-grab border-2 border-dashed border-blue-300 bg-blue-50/30 select-none",
          isScanning && "relative overflow-hidden",
        )}
        onClick={handleCardClick}
      >
        {/* 接続テスト中のローディングオーバーレイ */}
        {isScanning && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                接続テスト中...
              </span>
            </div>
          </div>
        )}
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="group relative mr-2 rounded-md p-2">
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
                  <div className="flex size-6 items-center justify-center rounded-md bg-gray-200">
                    <ImageIcon className="size-4 text-gray-500" />
                  </div>
                }
              />
            )}
            {/* <Button
            variant="ghost"
            size="icon"
            // TODO: 画像編集モーダーを実装したら有効化する
            disabled
            className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-black/70"
            onClick={() => setImageEditModalOpen(true)}
          >
            <EditIcon className="size-4 text-white" />
          </Button> */}
          </div>
          <div className="min-w-0 flex-1">
            <div className="group flex items-center">
              <CardTitle className="text-lg font-semibold">
                {serverInstance.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setNameEditModalOpen(true);
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="mt-1">
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-muted-foreground flex-shrink-0 text-xs">
                  HTTP:
                </span>
                <span
                  className="cursor-pointer truncate font-mono text-sm text-blue-600 underline hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyHttpUrl();
                  }}
                >
                  {makeHttpProxyServerUrl(serverInstance.id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-pointer hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyHttpUrl();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-muted-foreground flex-shrink-0 text-xs">
                  SSE:
                </span>
                <span
                  className="cursor-pointer truncate font-mono text-sm text-blue-600 underline hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyUrl();
                  }}
                >
                  {makeSseProxyServerUrl(serverInstance.id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-pointer hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyUrl();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          {!isSortMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 hover:bg-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">メニューを開く</span>
                  <MoreHorizontal className="size-4" />
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
                    handleScan();
                  }}
                  disabled={isScanning}
                >
                  <RefreshCw
                    className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")}
                  />
                  接続テスト
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
          )}
          {isSortMode && (
            <div className="flex size-6 items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                ドラッグ
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {/* ステータスとツール数の横並び */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isScanning && "animate-pulse",
                  serverInstance.serverStatus === ServerStatus.RUNNING
                    ? "bg-green-500"
                    : serverInstance.serverStatus === ServerStatus.STOPPED
                      ? "bg-gray-500"
                      : serverInstance.serverStatus === ServerStatus.PENDING
                        ? "bg-yellow-500"
                        : "bg-red-500",
                )}
              />
              <span className="text-sm">
                {isScanning
                  ? "接続テスト中"
                  : SERVER_STATUS_LABELS[
                      serverInstance.serverStatus as keyof typeof SERVER_STATUS_LABELS
                    ]}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Wrench className="h-4 w-4" />
                ツール
                <span>{tools.length}個</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={serverInstance.serverStatus === ServerStatus.RUNNING}
                  onCheckedChange={handleStatusToggle}
                  disabled={isStatusUpdating || isScanning}
                  className={cn(
                    "data-[state=checked]:bg-green-500",
                    "data-[state=unchecked]:bg-gray-300",
                    "dark:data-[state=unchecked]:bg-gray-600",
                    (isStatusUpdating || isScanning) && "opacity-50",
                  )}
                />
              </div>
            </div>
          </div>

          {/* MCPサーバーの概要 */}
          <div>
            <p className="text-sm text-gray-600">{displayDescription}</p>
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
        {/* <CardFooter className="mt-auto">
        <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          再設定
        </Button>
      </CardFooter> */}
      </Card>

      {/* トークンモーダル */}
      {/* {tokenModalOpen && (
        <UserMcpServerConfigModal
          onOpenChange={setTokenModalOpen}
          mcpServer={serverInstance}
          userMcpServerId={serverInstance.id}
          mode="edit"
        />
      )} */}

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

      {/* 画像編集モーダル */}
      {/* TODO: 画像編集モーダルを実装する */}
      {imageEditModalOpen && (
        <ImageEditModal
          open={imageEditModalOpen}
          userMcpServerId={serverInstance.id}
          initialImageUrl={serverInstance.iconPath ?? ""}
          onOpenChange={setImageEditModalOpen}
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
