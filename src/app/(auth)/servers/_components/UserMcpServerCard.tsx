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
  PenToolIcon as ToolIcon,
  Trash2Icon,
  EditIcon,
  ImageIcon,
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
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-200">
              <ImageIcon className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100"
            onClick={() => setImageEditModalOpen(true)}
          >
            <EditIcon className="h-4 w-4 text-white" />
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <span className="sr-only">メニューを開く</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
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
            <ToolIcon className="mr-2 h-4 w-4" />
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
