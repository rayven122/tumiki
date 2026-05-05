"use client";

import { Badge } from "@tumiki/ui/badge";
import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumiki/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { cn } from "@/lib/utils";
import type { McpServerId } from "@/schema/ids";
import { type RouterOutputs } from "@/trpc/react";
import { calculateExpirationStatus } from "@/lib/shared/expirationHelpers";
import {
  Edit2,
  ExternalLink,
  Layers,
  MoreHorizontal,
  Palette,
  RefreshCw,
  Trash2Icon,
  Wrench,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { McpConfigEditModal } from "../../[slug]/_components/McpConfigEditModal";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import { RefreshToolsModal } from "../RefreshToolsModal";
import { InboundAuthIndicator } from "../ServerCard/ServerCardInboundAuthIndicator";
import { OutboundApiKeyIndicator } from "../ServerCard/ServerCardOutboundApiKeyIndicator";
import { OutboundAuthIndicator } from "../ServerCard/ServerCardOutboundAuthIndicator";
import { OutboundNoneIndicator } from "../ServerCard/ServerCardOutboundNoneIndicator";
import { ToolsModal } from "../ServerCard/ToolsModal";
import { ServerStatusBadge } from "../ServerStatusBadge";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { IconEditModal } from "./IconEditModal";
import { ApiKeyExpirationDisplay } from "./UserMcpServerApiKeyExpirationDisplay";
import { FeatureBadges } from "./UserMcpServerFeatureBadges";
import { ServerMetaInfo } from "./UserMcpServerMetaInfo";
import { OAuthEndpointUrl } from "./UserMcpServerOAuthEndpointUrl";
import { ReuseTokenModal } from "./UserMcpServerReuseTokenModal";
import { useReauthenticateOAuth } from "./hooks/useReauthenticateOAuth";

type UserMcpServer = RouterOutputs["userMcpServer"]["findMcpServers"][number];

type UserMcpServerCardProps = {
  userMcpServer: UserMcpServer;
  revalidate?: () => Promise<void>;
  isSortMode?: boolean;
};

type ApiKey = UserMcpServer["apiKeys"][number];

/** 最も有効期限が短いAPIキーを取得 */
const findShortestExpirationApiKey = (apiKeys: ApiKey[]): ApiKey | null => {
  const keysWithExpiration = apiKeys.filter((key) => key.expiresAt !== null);
  if (keysWithExpiration.length === 0) return null;

  return keysWithExpiration.reduce((shortest, current) => {
    // expiresAt は filter で null が除外されているので安全
    return current.expiresAt! < shortest.expiresAt! ? current : shortest;
  });
};

export const UserMcpServerCard = ({
  userMcpServer,
  revalidate,
  isSortMode = false,
}: UserMcpServerCardProps) => {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const orgSlug = params.orgSlug;
  const currentUserId = session?.user?.id;

  // モーダル状態
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [configEditModalOpen, setConfigEditModalOpen] = useState(false);
  const [iconEditModalOpen, setIconEditModalOpen] = useState(false);
  const [refreshToolsModalOpen, setRefreshToolsModalOpen] = useState(false);

  // テンプレートインスタンスの取得
  const { templateInstances } = userMcpServer;
  const firstInstance = templateInstances[0];
  const tools = firstInstance?.tools ?? [];
  const mcpServer = firstInstance?.mcpServerTemplate ?? null;
  const mcpServerUrl = mcpServer?.url;
  const displayTags = mcpServer?.tags ?? [];

  // OAuth関連の状態を計算
  const unauthenticatedOAuthInstances = templateInstances.filter(
    (instance) => instance.isOAuthAuthenticated === false,
  );
  const targetInstanceForReauth =
    unauthenticatedOAuthInstances[0] ?? firstInstance;
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

  // 認証タイプ判定
  const isOAuthServer = userMcpServer.authType === "OAUTH";
  const isOAuthTemplateServer = mcpServer?.authType === "OAUTH";

  // Outbound認証タイプの判定（テンプレートごとの認証方式）
  const hasOAuthTemplates = templateInstances.some(
    (instance) => instance.mcpServerTemplate.authType === "OAUTH",
  );
  const hasApiKeyTemplates = templateInstances.some(
    (instance) => instance.mcpServerTemplate.authType === "API_KEY",
  );
  const hasNoneTemplates = templateInstances.some(
    (instance) => instance.mcpServerTemplate.authType === "NONE",
  );

  // API_KEYテンプレートの数
  const apiKeyTemplateCount = templateInstances.filter(
    (instance) => instance.mcpServerTemplate.authType === "API_KEY",
  ).length;

  // 編集可能なインスタンス（OAuth以外）
  const editableInstances = templateInstances.filter(
    (instance) => instance.mcpServerTemplate.authType !== "OAUTH",
  );
  const firstEditableInstance = editableInstances[0];

  // APIキーの有効期限状態
  const shortestApiKey = findShortestExpirationApiKey(userMcpServer.apiKeys);
  const apiKeyStatus = shortestApiKey
    ? calculateExpirationStatus(shortestApiKey.expiresAt)
    : null;

  const handleCardClick = () => {
    if (isSortMode) return;
    router.push(`/${orgSlug}/mcps/${userMcpServer.slug}`);
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
        {/* 右上のメニューボタン */}
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
                  <Link href={`/${orgSlug}/mcps/${userMcpServer.slug}`}>
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
                    setRefreshToolsModalOpen(true);
                  }}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  ツールを更新
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
                    setConfigEditModalOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  設定を編集
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModalOpen(true);
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <EntityIcon
            iconPath={userMcpServer.iconPath ?? mcpServer?.iconPath}
            fallbackUrl={mcpServerUrl}
            type="mcp"
            size="sm"
            alt={userMcpServer.name}
            className="mr-2"
          />
          <div className="min-w-0 flex-1 pr-10">
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
            {/* 認証インジケーター + 異常時のみステータス表示 */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {userMcpServer.serverStatus !== "RUNNING" && (
                <ServerStatusBadge serverStatus={userMcpServer.serverStatus} />
              )}
              <InboundAuthIndicator
                authType={userMcpServer.authType}
                apiKeyCount={
                  userMcpServer.authType === "API_KEY"
                    ? userMcpServer.apiKeys.length
                    : undefined
                }
                onApiKeyClick={
                  userMcpServer.authType === "API_KEY"
                    ? () => setConfigEditModalOpen(true)
                    : undefined
                }
              />
              {/* Outbound認証インジケーター（外部サービスへの接続方法） */}
              {hasOAuthTemplates && (
                <OutboundAuthIndicator
                  isAuthenticated={userMcpServer.allOAuthAuthenticated ?? false}
                  earliestExpiration={userMcpServer.earliestOAuthExpiration}
                  onReauthenticate={handleReauthenticate}
                  isReauthenticating={isReauthenticating}
                  unauthenticatedInstances={unauthenticatedInstancesForDisplay}
                />
              )}
              {hasApiKeyTemplates && (
                <OutboundApiKeyIndicator
                  templateCount={apiKeyTemplateCount}
                  onClick={() => setConfigEditModalOpen(true)}
                />
              )}
              {hasNoneTemplates && <OutboundNoneIndicator />}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {/* OAuth接続URLを表示（OAuthサーバーのみ） */}
          {isOAuthServer && (
            <OAuthEndpointUrl userMcpServerSlug={userMcpServer.slug} />
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

          {/* APIキー有効期限表示 */}
          <ApiKeyExpirationDisplay apiKeyStatus={apiKeyStatus} />

          {/* 機能バッジ（PIIマスキング、Dynamic Search、TOON変換） */}
          <FeatureBadges
            piiMaskingMode={userMcpServer.piiMaskingMode}
            dynamicSearch={userMcpServer.dynamicSearch}
            toonConversionEnabled={userMcpServer.toonConversionEnabled}
          />

          {/* メタ情報（最終使用日時、作成者） */}
          <ServerMetaInfo
            lastUsedAt={userMcpServer.lastUsedAt}
            creatorName={userMcpServer.createdBy?.name ?? null}
            isOwnServer={
              currentUserId !== undefined &&
              userMcpServer.createdById === currentUserId
            }
            hasCreator={userMcpServer.createdBy !== null}
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
          serverInstanceId={userMcpServer.id as McpServerId}
          serverName={userMcpServer.name}
          onOpenChange={setDeleteModalOpen}
          onSuccess={async () => {
            await revalidate?.();
            setDeleteModalOpen(false);
          }}
        />
      )}

      {/* 設定編集モーダル */}
      {configEditModalOpen && (
        <McpConfigEditModal
          open={configEditModalOpen}
          onOpenChange={setConfigEditModalOpen}
          serverId={userMcpServer.id as McpServerId}
          initialServerName={userMcpServer.name}
          templateInstanceId={firstEditableInstance?.id ?? null}
          templateName={firstEditableInstance?.mcpServerTemplate.name ?? ""}
          editableInstances={editableInstances.map((instance) => ({
            id: instance.id,
            name: instance.mcpServerTemplate.name,
            iconPath: instance.mcpServerTemplate.iconPath,
            url: instance.mcpServerTemplate.url,
          }))}
          onSuccess={async () => {
            await revalidate?.();
            setConfigEditModalOpen(false);
          }}
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

      {/* ツール更新モーダル */}
      {refreshToolsModalOpen && (
        <RefreshToolsModal
          open={refreshToolsModalOpen}
          onOpenChange={setRefreshToolsModalOpen}
          serverId={userMcpServer.id as McpServerId}
          serverName={userMcpServer.name}
          onSuccess={revalidate}
        />
      )}
    </>
  );
};
