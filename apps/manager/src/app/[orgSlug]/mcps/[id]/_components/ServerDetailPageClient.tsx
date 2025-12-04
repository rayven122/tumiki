"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Settings,
  Server,
  XCircle,
  Trash2,
  MoreVertical,
  Wrench,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { FaviconImage } from "@/components/ui/FaviconImage";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/utils/client/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/trpc/react";
import { ServerStatus, AuthType, ServerType } from "@tumiki/db/prisma";
import type { McpServerId } from "@/schema/ids";
import { AUTH_TYPE_LABELS } from "@/constants/userMcpServer";
import { CustomTabs } from "./CustomTabs";
import { OverviewTab } from "./OverviewTab";
import { LogsAnalyticsTab } from "./LogsAnalyticsTab";
import { ConnectionTab } from "./ConnectionTab";
import { EditServerDialog } from "./EditServerDialog";
import { DeleteServerDialog } from "./DeleteServerDialog";
import { BarChart3, Activity, Cable, Workflow } from "lucide-react";

// サーバータイプのラベル
const SERVER_TYPE_LABELS = {
  [ServerType.OFFICIAL]: "公式",
  [ServerType.CUSTOM]: "カスタム",
} as const;

type ServerDetailPageClientProps = {
  orgSlug: string;
  serverId: string;
};

export const ServerDetailPageClient = ({
  orgSlug,
  serverId,
}: ServerDetailPageClientProps) => {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAuthType, setSelectedAuthType] = useState<AuthType | null>(
    null,
  );

  const {
    data: server,
    isLoading,
    refetch,
  } = api.v2.userMcpServer.findById.useQuery(
    { id: serverId as McpServerId },
    { enabled: !!serverId },
  );

  // リクエスト統計情報を取得
  const { data: requestStats } = api.v2.userMcpServer.getRequestStats.useQuery(
    { userMcpServerId: serverId as McpServerId },
    { enabled: !!serverId },
  );

  const { mutate: updateStatus, isPending: isStatusUpdating } =
    api.v2.userMcpServer.updateServerStatus.useMutation({
      onSuccess: async () => {
        toast.success("MCPサーバーのステータスを更新しました");
        await refetch();
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  // APIキー一覧取得（表示用）
  const { data: apiKeys } = api.v2.mcpServerAuth.listApiKeys.useQuery(
    { serverId: serverId as McpServerId },
    {
      enabled: !!server && server.authType === AuthType.API_KEY,
    },
  );

  const handleStatusToggle = (checked: boolean) => {
    if (!server) return;
    updateStatus({
      id: serverId as McpServerId,
      isEnabled: checked,
    });
  };

  // サーバー情報が取得できたら認証タイプを初期化
  if (server && selectedAuthType === null) {
    setSelectedAuthType(server.authType);
  }

  // 有効なAPIキーの数を計算
  const activeApiKeysCount = apiKeys?.filter((key) => key.isActive).length ?? 0;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-4 h-10 w-10 animate-pulse rounded-md bg-gray-200"></div>
              <div className="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
            </div>
          </header>

          {/* Card Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                  <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-lg bg-gray-200"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-6 w-24 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <header className="mb-6 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/${orgSlug}/mcps`)}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">サーバー詳細</h1>
          </header>

          {/* Error Card */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-3 text-red-600">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-medium">サーバーが見つかりません</p>
                  <p className="mt-1 text-sm text-red-500">
                    指定されたIDのサーバーが存在しないか、アクセス権限がありません。
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${orgSlug}/mcps`)}
                  className="border-red-200 text-red-600 hover:bg-red-100"
                >
                  戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <header className="mb-6 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${orgSlug}/mcps`)}
            className="mr-4"
            aria-label="前のページに戻る"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="truncate text-2xl font-bold">{server.name}</h1>
        </header>

        {/* Server Info Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* メイン情報エリア */}
              <div className="flex items-start justify-between gap-4">
                {/* 左側: アイコン + 情報 */}
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {/* アイコン */}
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border bg-gray-50">
                    {server.iconPath ? (
                      <Image
                        src={server.iconPath}
                        alt={server.name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    ) : server.mcpServer?.iconPath ? (
                      <Image
                        src={server.mcpServer.iconPath}
                        alt={server.name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    ) : (
                      <FaviconImage
                        url={server.mcpServer?.url ?? null}
                        alt={server.name}
                        size={48}
                        fallback={
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                            <Server className="h-8 w-8 text-blue-600" />
                          </div>
                        }
                      />
                    )}
                  </div>

                  {/* サーバー情報 */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* 説明 */}
                    <p className="text-sm leading-relaxed break-words whitespace-pre-line text-gray-600">
                      {server.description}
                    </p>

                    {/* メタ情報（1行目） */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        <span>ツール</span>
                        <span className="font-medium">
                          {server.tools.length}個
                        </span>
                      </div>
                      <span>
                        作成日:{" "}
                        {new Date(server.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                      <span>
                        最終更新:{" "}
                        {new Date(server.updatedAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>

                    {/* サーバー情報（2行目） */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {/* サーバータイプ */}
                      <div className="flex items-center gap-1.5">
                        <Workflow className="h-3 w-3" />
                        <span>タイプ:</span>
                        <Badge variant="outline" className="h-4 px-1.5 text-xs">
                          {SERVER_TYPE_LABELS[server.serverType]}
                        </Badge>
                      </div>

                      {/* 認証 */}
                      {selectedAuthType !== null && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3" />
                            <span>認証:</span>
                            <Badge
                              variant="outline"
                              className="h-4 px-1.5 text-xs"
                            >
                              {AUTH_TYPE_LABELS[selectedAuthType]}
                            </Badge>
                          </div>
                          {selectedAuthType === AuthType.API_KEY && (
                            <div className="flex items-center gap-1">
                              <span>有効なキー:</span>
                              <span className="font-medium">
                                {activeApiKeysCount}個
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右側: スイッチ + メニュー */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {server.serverStatus === ServerStatus.RUNNING
                        ? "接続可能"
                        : "接続不可"}
                    </span>
                    <Switch
                      checked={server.serverStatus === ServerStatus.RUNNING}
                      onCheckedChange={handleStatusToggle}
                      disabled={isStatusUpdating}
                      className={cn(
                        "data-[state=checked]:bg-green-500",
                        "data-[state=unchecked]:bg-gray-300",
                        "dark:data-[state=unchecked]:bg-gray-600",
                      )}
                      aria-label={
                        server.serverStatus === ServerStatus.RUNNING
                          ? "接続を無効にする"
                          : "接続を有効にする"
                      }
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="その他のオプション"
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        設定を編集
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <CustomTabs
          tabs={[
            {
              id: "overview",
              label: "概要",
              icon: <BarChart3 className="h-4 w-4" />,
            },
            {
              id: "connection",
              label: "接続設定",
              icon: <Cable className="h-4 w-4" />,
            },
            {
              id: "logs",
              label: "ログ・分析",
              icon: <Activity className="h-4 w-4" />,
            },
          ]}
          defaultTab="overview"
        >
          {(activeTab) => {
            if (activeTab === "overview") {
              return (
                <OverviewTab
                  server={server}
                  requestStats={requestStats}
                  serverId={serverId as McpServerId}
                />
              );
            }
            if (activeTab === "connection") {
              return (
                <ConnectionTab
                  server={server}
                  serverId={serverId as McpServerId}
                />
              );
            }
            if (activeTab === "logs") {
              return (
                <LogsAnalyticsTab
                  serverId={serverId as McpServerId}
                  requestStats={requestStats}
                />
              );
            }
            return null;
          }}
        </CustomTabs>

        {/* Dialogs */}
        {showEditDialog && (
          <EditServerDialog
            server={server}
            onClose={() => setShowEditDialog(false)}
            onSuccess={async () => {
              await refetch();
            }}
          />
        )}
        {showDeleteDialog && (
          <DeleteServerDialog
            server={server}
            orgSlug={orgSlug}
            onClose={() => setShowDeleteDialog(false)}
          />
        )}
      </div>
    </div>
  );
};
