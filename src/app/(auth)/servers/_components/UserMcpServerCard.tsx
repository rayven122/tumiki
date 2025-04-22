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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Trash2Icon,
  EditIcon,
  ImageIcon,
  MoreHorizontal,
  Wrench,
} from "lucide-react";
import { ToolsModal } from "./ToolsModal";
import type { Prisma } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageEditModal } from "./ImageEditModal";
import { NameEditModal } from "./NameEditModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

type UserMcpServerWithTools = Prisma.UserMcpServerGetPayload<{
  select: {
    id: true;
    name: true;
    tools: true;
    mcpServer: true;
  };
}>;

type UserMcpServerCardProps = {
  userMcpServer: UserMcpServerWithTools;
  onDelete?: (id: string) => Promise<void>;
  onUpdateName?: (id: string, name: string) => Promise<void>;
  onUpdateImage?: (id: string, imageUrl: string) => Promise<void>;
};

export const UserMcpServerCard = ({
  userMcpServer,
  onDelete,
  onUpdateName,
  onUpdateImage,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nameEditModalOpen, setNameEditModalOpen] = useState(false);
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false);
  const [newName, setNewName] = useState(
    userMcpServer.name ?? userMcpServer.mcpServer.name,
  );
  const [newImageUrl, setNewImageUrl] = useState(
    userMcpServer.mcpServer.iconPath ?? "",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsLoading(true);
    try {
      await onDelete(userMcpServer.id);
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to delete server:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!onUpdateName) return;

    setIsLoading(true);
    try {
      await onUpdateName(userMcpServer.id, newName);
      setNameEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update server name:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpdate = async () => {
    if (!onUpdateImage) return;

    setIsLoading(true);
    try {
      await onUpdateImage(userMcpServer.id, newImageUrl);
      setImageEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update server image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="group relative mr-2 rounded-md p-2">
          {userMcpServer.mcpServer.iconPath ? (
            <Image
              src={userMcpServer.mcpServer.iconPath || "/placeholder.svg"}
              alt={userMcpServer.name ?? userMcpServer.mcpServer.name}
              width={32}
              height={32}
            />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-md bg-gray-200">
              <ImageIcon className="size-4 text-gray-500" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-black/70"
            onClick={() => setImageEditModalOpen(true)}
          >
            <EditIcon className="size-4 text-white" />
          </Button>
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <CardTitle>
              {userMcpServer.name ?? userMcpServer.mcpServer.name}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-6 w-6"
              onClick={() => setNameEditModalOpen(true)}
            >
              <EditIcon className="h-3 w-3" />
            </Button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              ツール: {userMcpServer.tools.length}
            </Badge>
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
            <DropdownMenuItem onClick={() => setImageEditModalOpen(true)}>
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
        {/* ツール一覧を表示するボタン */}
        <Button
          variant="outline"
          size="sm"
          className="mb-2 flex w-full items-center justify-between"
          onClick={() => setToolsModalOpen(true)}
        >
          <span className="flex items-center">
            <Wrench className="mr-2 size-4" />
            利用可能なツール
          </span>
          <Badge variant="secondary" className="ml-2">
            {userMcpServer.tools.length}
          </Badge>
        </Button>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          接続
        </Button>
      </CardFooter>

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={userMcpServer.name ?? userMcpServer.mcpServer.name}
        tools={userMcpServer.tools}
      />

      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        serverName={userMcpServer.name ?? userMcpServer.mcpServer.name}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* 名前編集モーダル */}
      <NameEditModal
        open={nameEditModalOpen}
        onOpenChange={setNameEditModalOpen}
        name={newName}
        onNameChange={setNewName}
        onUpdate={handleNameUpdate}
        isLoading={isLoading}
      />

      {/* 画像編集モーダル */}
      <ImageEditModal
        open={imageEditModalOpen}
        onOpenChange={setImageEditModalOpen}
        imageUrl={newImageUrl}
        onImageUrlChange={setNewImageUrl}
        onUpdate={handleImageUpdate}
        isLoading={isLoading}
      />
    </Card>
  );
};
