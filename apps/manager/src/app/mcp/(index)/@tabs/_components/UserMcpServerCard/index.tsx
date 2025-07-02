"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import {
  Trash2Icon,
  EditIcon,
  ImageIcon,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { ToolsModal } from "../ToolsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { NameEditModal } from "./NameEditModal";
import { ImageEditModal } from "./ImageEditModal";
import { StatusEditModal } from "./StatusEditModal";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { makeHttpProxyServerUrl, makeSseProxyServerUrl } from "@/utils/url";
import { toast } from "@/utils/client/toast";

import { type RouterOutputs, api } from "@/trpc/react";
import { formatDateTime } from "@/utils/date";
import { ToolBadgeList } from "../../custom-servers/_components/ToolBadgeList";
import { EditServerInstanceModal } from "./EditServerInstanceModal";
import { SERVER_STATUS_LABELS } from "@/constants/userMcpServer";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";

type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findOfficialServers"][number];

type UserMcpServerCardProps = {
  serverInstance: ServerInstance;
  revalidate?: () => Promise<void>;
};

export const UserMcpServerCard = ({
  serverInstance,
  revalidate,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  // const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nameEditModalOpen, setNameEditModalOpen] = useState(false);
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false);
  const [toolsEditModalOpen, setToolsEditModalOpen] = useState(false);
  const [statusEditModalOpen, setStatusEditModalOpen] = useState(false);

  const { tools } = serverInstance;

  const apiKey = serverInstance.apiKeys[0]?.apiKey ?? "";

  api.userMcpServerConfig.findServersWithTools.usePrefetchQuery({
    userMcpServerConfigIds:
      serverInstance.serverType === ServerType.OFFICIAL
        ? serverInstance.userMcpServers.map(({ id }) => id)
        : undefined,
  });

  const copyUrl = async () => {
    await copyToClipboard(makeSseProxyServerUrl(apiKey));
    toast.success("SSE URLをコピーしました");
  };

  const copyHttpUrl = async () => {
    await copyToClipboard(makeHttpProxyServerUrl(apiKey));
    toast.success("Streamable HTTP をコピーしました");
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="group relative mr-2 rounded-md p-2">
          {serverInstance.iconPath ? (
            <Image
              src={serverInstance.iconPath || "/placeholder.svg"}
              alt={serverInstance.name}
              width={32}
              height={32}
            />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-md bg-gray-200">
              <ImageIcon className="size-4 text-gray-500" />
            </div>
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
          <div className="flex items-center">
            <CardTitle>{serverInstance.name}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-6 w-6"
              onClick={() => setNameEditModalOpen(true)}
            >
              <EditIcon className="h-3 w-3" />
            </Button>
          </div>
          <div className="mt-1">
            <div className="flex items-center space-x-2 overflow-hidden">
              <span className="text-muted-foreground flex-shrink-0 text-xs">
                SSE:
              </span>
              <span
                className="cursor-pointer truncate font-mono text-sm text-blue-600 underline"
                onClick={copyUrl}
              >
                {makeSseProxyServerUrl(apiKey)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={copyUrl}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center space-x-2 overflow-hidden">
              <span className="text-muted-foreground flex-shrink-0 text-xs">
                HTTP:
              </span>
              <span
                className="cursor-pointer truncate font-mono text-sm text-blue-600 underline"
                onClick={copyUrl}
              >
                {makeHttpProxyServerUrl(apiKey)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={copyHttpUrl}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setNameEditModalOpen(true)}>
              <EditIcon className="mr-2 h-4 w-4" />
              名前を編集
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setToolsEditModalOpen(true)}>
              <EditIcon className="mr-2 h-4 w-4" />
              ツールを編集
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusEditModalOpen(true)}>
              <EditIcon className="mr-2 h-4 w-4" />
              ステータスを変更
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setImageEditModalOpen(true)}
              // TODO: 画像編集モーダーを実装したら有効化する
              disabled
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              画像を編集
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteModalOpen(true)}>
              <Trash2Icon className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">作成日</span>
            <span>{formatDateTime(serverInstance.createdAt)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">最終更新日</span>
            <span>{formatDateTime(serverInstance.updatedAt)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">接続サーバー</span>
            <span>{serverInstance.name}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">ステータス</span>
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  serverInstance.serverStatus === ServerStatus.RUNNING
                    ? "bg-green-500"
                    : serverInstance.serverStatus === ServerStatus.STOPPED
                      ? "bg-gray-500"
                      : "bg-red-500"
                }`}
              />
              <span>{SERVER_STATUS_LABELS[serverInstance.serverStatus]}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-6 w-6"
                onClick={() => setStatusEditModalOpen(true)}
              >
                <EditIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-muted-foreground text-sm">
            ツール・ツールグループ
          </span>
          <div className="mt-1 flex items-center space-x-2">
            {/* ツール一覧を表示するボタン */}
            <ToolBadgeList
              tools={
                serverInstance.serverType === ServerType.OFFICIAL
                  ? tools
                  : tools.map((tool) => ({
                      ...tool,
                      userMcpServerName: serverInstance.userMcpServers.find(
                        (server) => server.id === tool.userMcpServerConfigId,
                      )?.name,
                    }))
              }
              // TODO: ツールグループの実装が完了したら設定する
              toolGroups={[]}
            />
          </div>
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
        tools={tools}
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
          onOpenChange={setNameEditModalOpen}
          onSuccess={async () => {
            await revalidate?.();
            setNameEditModalOpen(false);
          }}
        />
      )}

      {/* ツール編集モーダル */}
      {toolsEditModalOpen && (
        <EditServerInstanceModal
          serverInstance={serverInstance}
          onClose={() => setToolsEditModalOpen(false)}
          onSuccess={async () => {
            await revalidate?.();
            setToolsEditModalOpen(false);
          }}
        />
      )}

      {/* ステータス編集モーダル */}
      {statusEditModalOpen && (
        <StatusEditModal
          serverInstanceId={serverInstance.id}
          initialStatus={serverInstance.serverStatus}
          onOpenChange={setStatusEditModalOpen}
          onSuccess={async () => {
            await revalidate?.();
            setStatusEditModalOpen(false);
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
    </Card>
  );
};
