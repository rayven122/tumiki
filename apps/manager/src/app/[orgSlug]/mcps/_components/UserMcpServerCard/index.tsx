"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import {
  Trash2Icon,
  MoreHorizontal,
  ExternalLink,
  Wrench,
  Edit2,
  RefreshCw,
  Palette,
  Layers,
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
import { IconEditModal } from "./IconEditModal";
import { AuthTypeIndicator } from "../ServerCard/_components/AuthTypeIndicator";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { type RouterOutputs } from "@/trpc/react";
import { McpServerIcon } from "../McpServerIcon";
import { ServerStatusBadge } from "../ServerStatusBadge";
import { calculateExpirationStatus } from "@/utils/shared/expirationHelpers";
import { ApiKeyExpirationDisplay } from "./_components/ApiKeyExpirationDisplay";
import { OAuthTokenExpirationDisplay } from "./_components/OAuthTokenExpirationDisplay";
import { OAuthEndpointUrl } from "./_components/OAuthEndpointUrl";
import { ReuseTokenModal } from "./_components/ReuseTokenModal";
import { useReauthenticateOAuth } from "./_hooks/useReauthenticateOAuth";
import type { McpServerId } from "@/schema/ids";

type UserMcpServer =
  RouterOutputs["v2"]["userMcpServer"]["findMcpServers"][number];

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
  const [iconEditModalOpen, setIconEditModalOpen] = useState(false);

  // 最初のテンプレートインスタンスを使用（ツール表示用）
  const firstInstance = userMcpServer.templateInstances[0];
  const tools = firstInstance?.tools ?? [];
  const mcpServer = firstInstance?.mcpServerTemplate ?? null;

  // OAuth未認証のインスタンス一覧を取得（UIで表示用）
  // カスタムMCPサーバーの場合、どのMCPが認証を必要としているか表示する
  const unauthenticatedOAuthInstances = userMcpServer.templateInstances.filter(
    (instance) => instance.isOAuthAuthenticated === false,
  );

  // OAuth未認証のインスタンスを探す（認証が必要なものを優先）
  // カスタムMCPサーバーの場合、最初のインスタンスがOAuth非対応（例: Context7 = NONE）でも
  // 2番目以降にOAuth対応インスタンス（例: Linear MCP）がある場合、そちらを使用する
  const firstUnauthenticatedOAuthInstance = unauthenticatedOAuthInstances[0];

  // OAuth再認証用のターゲットインスタンス
  // 未認証OAuthインスタンスがあればそれを使用、なければ最初のインスタンス
  const targetInstanceForReauth =
    firstUnauthenticatedOAuthInstance ?? firstInstance;

  // AuthTypeIndicator用の未認証インスタンス情報を生成
  const unauthenticatedInstancesForDisplay = unauthenticatedOAuthInstances.map(
    (instance) => ({
      templateName: instance.mcpServerTemplate.name,
      iconPath: instance.mcpServerTemplate.iconPath,
    }),
  );

  // OAuth再認証フック
  const {
    handleReauthenticate,
    handleNewAuthentication,
    isPending: isReauthenticating,
    showReuseModal,
    setShowReuseModal,
    reusableTokens,
    targetInstanceId,
  } = useReauthenticateOAuth({
    mcpServerTemplateInstanceId: targetInstanceForReauth?.id ?? "",
  });

  // OAuth認証タイプの場合は常に再認証ボタンを表示（MCPサーバー自体のauthTypeを参照）
  const isOAuthServer = userMcpServer.authType === "OAUTH";
  const isOAuthTemplateServer = mcpServer?.authType === "OAUTH";

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
            {/* 認証タイプインジケーター */}
            <AuthTypeIndicator
              authType={userMcpServer.authType}
              apiKeyCount={
                userMcpServer.authType === "API_KEY"
                  ? userMcpServer.apiKeys.length
                  : undefined
              }
              isOAuthAuthenticated={userMcpServer.allOAuthAuthenticated}
              onReauthenticate={handleReauthenticate}
              isReauthenticating={isReauthenticating}
              unauthenticatedInstances={unauthenticatedInstancesForDisplay}
            />
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
                {/* OAuthサーバーの場合は常に再認証オプションを表示 */}
                {isOAuthTemplateServer && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleReauthenticate();
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
                    setIconEditModalOpen(true);
                  }}
                >
                  <Palette className="mr-2 h-4 w-4" />
                  アイコンを変更
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
            <McpServerIcon
              iconPath={userMcpServer.iconPath ?? mcpServer?.iconPath}
              fallbackUrl={mcpServerUrl}
              alt={userMcpServer.name}
              size={32}
            />
          </div>
          <div className="min-w-0 flex-1 pr-24">
            <div className="flex items-center gap-1">
              {userMcpServer.serverType === "CUSTOM" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Layers className="size-4 shrink-0 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>統合MCP</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <CardTitle className="truncate">{userMcpServer.name}</CardTitle>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ServerStatusBadge serverStatus={userMcpServer.serverStatus} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {/* OAuth接続URLを表示（OAuthサーバーのみ） */}
          {isOAuthServer && (
            <OAuthEndpointUrl userMcpServerId={userMcpServer.id} />
          )}

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
          <div className="space-y-1">
            <ApiKeyExpirationDisplay apiKeyStatus={apiKeyStatus} />
            {isOAuthServer && userMcpServer.earliestOAuthExpiration && (
              <OAuthTokenExpirationDisplay
                expiresAt={userMcpServer.earliestOAuthExpiration}
              />
            )}
          </div>

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
          serverInstanceId={userMcpServer.id as McpServerId}
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
          serverInstanceId={userMcpServer.id as McpServerId}
          initialName={userMcpServer.name}
          onSuccess={async () => {
            await revalidate?.();
            setNameEditModalOpen(false);
          }}
          onOpenChange={setNameEditModalOpen}
        />
      )}

      {/* アイコン編集モーダル */}
      {iconEditModalOpen && (
        <IconEditModal
          serverInstanceId={userMcpServer.id as McpServerId}
          initialIconPath={userMcpServer.iconPath}
          fallbackUrl={mcpServerUrl}
          orgSlug={orgSlug}
          onSuccess={async () => {
            await revalidate?.();
            setIconEditModalOpen(false);
          }}
          onOpenChange={setIconEditModalOpen}
        />
      )}

      {/* トークン再利用モーダル */}
      {showReuseModal && (
        <ReuseTokenModal
          open={showReuseModal}
          onOpenChange={setShowReuseModal}
          reusableTokens={reusableTokens}
          targetInstanceId={targetInstanceId}
          onNewAuthentication={handleNewAuthentication}
          onSuccess={revalidate}
        />
      )}
    </>
  );
};
