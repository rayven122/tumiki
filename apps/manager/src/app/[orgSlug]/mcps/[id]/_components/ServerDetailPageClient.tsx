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
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  MoreVertical,
  Wrench,
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
import { ServerStatus } from "@tumiki/db/prisma";
import type { McpServerId } from "@/schema/ids";

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

  // リクエストログ一覧を取得
  const { data: requestLogs } = api.v2.userMcpServer.findRequestLogs.useQuery(
    { userMcpServerId: serverId as McpServerId },
    { enabled: !!serverId },
  );

  // ツール統計を取得
  const { data: toolStats } = api.v2.userMcpServer.getToolStats.useQuery(
    { userMcpServerId: serverId as McpServerId },
    { enabled: !!serverId },
  );

  const { mutate: updateStatus, isPending: isStatusUpdating } =
    api.v2.userMcpServer.updateServerStatus.useMutation({
      onSuccess: async () => {
        toast.success("サーバーステータスを更新しました");
        await refetch();
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const handleStatusToggle = (checked: boolean) => {
    if (!server) return;
    updateStatus({
      id: serverId as McpServerId,
      isEnabled: checked,
    });
  };

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

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ServerStatus.STOPPED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case ServerStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case ServerStatus.PENDING:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ServerStatus) => {
    const variants = {
      [ServerStatus.RUNNING]: "default",
      [ServerStatus.STOPPED]: "secondary",
      [ServerStatus.ERROR]: "destructive",
      [ServerStatus.PENDING]: "secondary",
    } as const;

    const labels = {
      [ServerStatus.RUNNING]: "実行中",
      [ServerStatus.STOPPED]: "停止中",
      [ServerStatus.ERROR]: "エラー",
      [ServerStatus.PENDING]: "検証中",
    };

    return (
      <Badge variant={variants[status] ?? "secondary"}>
        {getStatusIcon(status)}
        <span className="ml-1">{labels[status] ?? status}</span>
      </Badge>
    );
  };

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
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(server.serverStatus)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {server.serverStatus === ServerStatus.RUNNING
                            ? "実行中"
                            : "停止中"}
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
                              ? "サーバーを停止する"
                              : "サーバーを開始する"
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
                            <MoreVertical
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setShowEditDialog(true)}
                          >
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
                  <p className="mt-2 break-words whitespace-pre-line text-sm leading-relaxed text-gray-600">
                    {server.description}
                  </p>
                  <div className="mt-3 flex flex-col space-y-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
                    <div className="flex items-center space-x-1">
                      <Wrench className="h-3 w-3" />
                      <span>ツール</span>
                      <span className="font-medium">
                        {server.tools.length}個
                      </span>
                    </div>
                    <span className="flex items-center">
                      作成日:{" "}
                      {new Date(server.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                    <span className="flex items-center">
                      最終更新:{" "}
                      {new Date(server.updatedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for Tabs */}
        <div className="mt-8 text-center text-gray-500">
          <p>タブコンポーネントは次のフェーズで実装します</p>
          <div className="mt-4 text-sm">
            <p>Server ID: {serverId}</p>
            <p>Tools: {server.tools.length}</p>
            <p>Request Stats: {requestStats ? "Loaded" : "Loading..."}</p>
            <p>Request Logs: {requestLogs ? requestLogs.length : "Loading..."}</p>
            <p>Tool Stats: {toolStats ? toolStats.length : "Loading..."}</p>
          </div>
        </div>

        {/* Dialogs - Placeholder */}
        {showEditDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-bold">編集ダイアログ</h2>
                <p className="mb-4 text-sm text-gray-600">
                  次のフェーズで実装します
                </p>
                <Button onClick={() => setShowEditDialog(false)}>閉じる</Button>
              </CardContent>
            </Card>
          </div>
        )}
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-bold">削除ダイアログ</h2>
                <p className="mb-4 text-sm text-gray-600">
                  次のフェーズで実装します
                </p>
                <Button onClick={() => setShowDeleteDialog(false)}>
                  閉じる
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
