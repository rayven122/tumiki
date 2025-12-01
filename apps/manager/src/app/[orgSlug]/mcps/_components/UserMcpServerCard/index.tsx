"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import {
  Trash2Icon,
  ImageIcon,
  MoreHorizontal,
  ExternalLink,
  Wrench,
  Edit2,
  RefreshCw,
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
import { AuthTypeBadge } from "../ServerCard/_components/AuthTypeBadge";
import { cn } from "@/lib/utils";

import { type RouterOutputs } from "@/trpc/react";
import { FaviconImage } from "@/components/ui/FaviconImage";
import { ServerStatusBadge } from "../ServerStatusBadge";
import { calculateExpirationStatus } from "@/utils/shared/expirationHelpers";
import { ExpirationDisplay } from "./_components/ExpirationDisplay";
import { useReauthenticateOAuth } from "./_hooks/useReauthenticateOAuth";

type UserMcpServer =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"][number];

type UserMcpServerCardProps = {
  userMcpServer: UserMcpServer;
  revalidate?: () => Promise<void>;
  isSortMode?: boolean;
};

export const UserMcpServerCard = ({
  userMcpServer,
  revalidate,
  isSortMode = false,
}: UserMcpServerCardProps) => {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const orgSlug = params.orgSlug;

  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nameEditModalOpen, setNameEditModalOpen] = useState(false);

  const { tools, mcpServer } = userMcpServer;

  // OAuth再認証フック
  const { handleReauthenticate, isPending: isReauthenticating } =
    useReauthenticateOAuth({
      mcpServerId: userMcpServer.id,
    });

  // OAuth期限切れ検出
  const needsReauth =
    mcpServer?.authType === "OAUTH" &&
    userMcpServer.oauthTokenStatus &&
    (!userMcpServer.oauthTokenStatus.hasToken ||
      userMcpServer.oauthTokenStatus.isExpired);

  // MCPサーバーのURLを取得（ファビコン表示用）
  const mcpServerUrl = mcpServer?.url;

  const displayTags = mcpServer?.tags ?? [];

  const handleCardClick = () => {
    if (isSortMode) return; // ソートモード時はクリック無効
    router.push(`/${orgSlug}/mcps/${userMcpServer.id}`);
  };

  // 最も有効期限が短いAPIキーを取得（バックエンドで既に有効なキーのみ取得済み）
  const getShortestExpiringApiKey = () => {
    const apiKeysWithExpiration = userMcpServer.apiKeys.filter(
      (key) => key.expiresAt,
    );

    if (apiKeysWithExpiration.length === 0) return null;

    return apiKeysWithExpiration.reduce((shortest, current) => {
      if (!shortest.expiresAt) return current;
      if (!current.expiresAt) return shortest;
      return current.expiresAt < shortest.expiresAt ? current : shortest;
    });
  };

  const shortestApiKey = getShortestExpiringApiKey();

  // APIキーの有効期限状態を計算
  const apiKeyStatus = shortestApiKey
    ? calculateExpirationStatus(shortestApiKey.expiresAt)
    : null;

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
        {/* 右上のバッジとメニュー */}
        {!isSortMode && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Backend認証タイプバッジ */}
            {mcpServer?.authType && (
              <AuthTypeBadge authType={mcpServer.authType} />
            )}
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
                  <Link href={`/${orgSlug}/mcps/${userMcpServer.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    詳細を見る
                  </Link>
                </DropdownMenuItem>
                {/* OAuth期限切れ時のみ表示 */}
                {needsReauth && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReauthenticate();
                    }}
                    disabled={isReauthenticating}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    再認証
                  </DropdownMenuItem>
                )}
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

        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="mr-2 rounded-md p-2">
            {userMcpServer.iconPath || mcpServer?.iconPath ? (
              <Image
                src={
                  userMcpServer.iconPath ??
                  mcpServer?.iconPath ??
                  "/placeholder.svg"
                }
                alt={userMcpServer.name}
                width={32}
                height={32}
              />
            ) : (
              <FaviconImage
                url={mcpServerUrl}
                alt={userMcpServer.name}
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
            <CardTitle>{userMcpServer.name}</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <ServerStatusBadge serverStatus={userMcpServer.serverStatus} />
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

          {/* 有効期限表示 */}
          <ExpirationDisplay
            oauthTokenStatus={userMcpServer.oauthTokenStatus}
            apiKeyStatus={apiKeyStatus}
          />

          {/* カテゴリータグ */}
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
        serverName={userMcpServer.name}
        tools={tools}
      />

      {/* 削除確認モーダル */}
      {deleteModalOpen && (
        <DeleteConfirmModal
          open={deleteModalOpen}
          serverInstanceId={userMcpServer.id}
          serverName={userMcpServer.name}
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
          serverInstanceId={userMcpServer.id}
          initialName={userMcpServer.name}
          initialDescription={userMcpServer.description}
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
