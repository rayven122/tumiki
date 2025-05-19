"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ApiTokenModal } from "../ApiTokenModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { NameEditModal } from "./NameEditModal";
import { ImageEditModal } from "./ImageEditModal";
import { useRouter } from "next/navigation";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { makeMcpProxyServerUrl } from "@/utils/url";
import { toast } from "@/utils/client/toast";
import { ToolBadgeList } from "../../(index)/@tabs/custom-servers/_components/ToolBadgeList";
import { type RouterOutputs } from "@/trpc/react";
import { formatDateTime } from "@/utils/date";

type UserMcpServerWithTool =
  RouterOutputs["userMcpServer"]["findAllWithMcpServerTools"][number];

type UserMcpServerCardProps = {
  userMcpServer: UserMcpServerWithTool;
};

export const UserMcpServerCard = ({
  userMcpServer,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nameEditModalOpen, setNameEditModalOpen] = useState(false);
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false);
  const router = useRouter();

  const serverName = userMcpServer.name ?? userMcpServer.mcpServer.name;

  const copyUrl = async () => {
    await copyToClipboard(makeMcpProxyServerUrl(userMcpServer.id));
    toast.success("URLをコピーしました");
  };

  const isActive = true;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="group relative mr-2 rounded-md p-2">
          {userMcpServer.mcpServer.iconPath ? (
            <Image
              src={userMcpServer.mcpServer.iconPath || "/placeholder.svg"}
              alt={serverName}
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
            <CardTitle>{serverName}</CardTitle>
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
                URL:
              </span>
              <span
                className="cursor-pointer truncate font-mono text-sm text-blue-600 underline"
                onClick={copyUrl}
              >
                {makeMcpProxyServerUrl(userMcpServer.id)}
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
            <DropdownMenuItem
              onClick={() => setImageEditModalOpen(true)}
              // TODO: 画像編集モーダーを実装したら有効化する
              disabled
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              画像を編集
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteModalOpen(true)}
              className="text-red-600 focus:text-red-600"
            >
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
            <span>{formatDateTime(userMcpServer.createdAt)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">最終更新日</span>
            <span>{formatDateTime(userMcpServer.updatedAt)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">接続サーバー</span>
            <span>{userMcpServer.mcpServer.name}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm">ステータス</span>
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`}
              />
              <span>{isActive ? "稼働中" : "停止中"}</span>
            </div>
          </div>
        </div>
        <div className="mt-2">
          {/* ツール一覧を表示するボタン */}
          <ToolBadgeList
            tools={userMcpServer.tools}
            // TODO: ツールグループの実装が完了したら設定する
            toolGroups={[]}
          />
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        {/* <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          再設定
        </Button> */}
      </CardFooter>

      {/* トークンモーダル */}
      {tokenModalOpen && (
        <ApiTokenModal
          onOpenChange={setTokenModalOpen}
          mcpServer={userMcpServer.mcpServer}
          userMcpServerId={userMcpServer.id}
          mode="edit"
        />
      )}

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={serverName}
        tools={userMcpServer.tools}
      />

      {/* 削除確認モーダル */}
      {deleteModalOpen && (
        <DeleteConfirmModal
          open={deleteModalOpen}
          userMcpServerId={userMcpServer.id}
          serverName={serverName}
          onOpenChange={setDeleteModalOpen}
          onSuccess={() => {
            router.refresh();
            setDeleteModalOpen(false);
          }}
        />
      )}

      {/* 名前編集モーダル */}
      {nameEditModalOpen && (
        <NameEditModal
          userMcpServerId={userMcpServer.id}
          initialName={serverName}
          onOpenChange={setNameEditModalOpen}
          onSuccess={() => {
            router.refresh();
            setNameEditModalOpen(false);
          }}
        />
      )}

      {/* 画像編集モーダル */}
      {/* TODO: 画像編集モーダルを実装する */}
      {imageEditModalOpen && (
        <ImageEditModal
          open={imageEditModalOpen}
          serverName={serverName}
          userMcpServerId={userMcpServer.id}
          initialImageUrl={userMcpServer.mcpServer.iconPath ?? ""}
          onOpenChange={setImageEditModalOpen}
        />
      )}
    </Card>
  );
};
