"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomTabs } from "./CustomTabs";
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
  FileText,
  BarChart3,
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
import { OverviewTab } from "./OverviewTab";
import { LogsAnalyticsTab } from "./LogsAnalyticsTab";
import { EditServerDialog } from "./EditServerDialog";
import { DeleteServerDialog } from "./DeleteServerDialog";
import { ServerType } from "@tumiki/db/prisma";
import { getMcpServerDescription } from "@/constants/mcpServerDescriptions";

type ServerDetailPageProps = {
  instanceId: string;
};

export const ServerDetailPage = ({ instanceId }: ServerDetailPageProps) => {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: instance,
    isLoading,
    refetch,
  } = api.userMcpServerInstance.findById.useQuery(
    { id: instanceId },
    { enabled: !!instanceId },
  );

  // リクエストログの統計情報を取得
  const { data: requestStats } =
    api.userMcpServerInstance.getRequestStats.useQuery(
      { instanceId },
      { enabled: !!instanceId },
    );

  // リクエストログ一覧を取得
  const { data: requestLogs, refetch: refetchLogs } =
    api.userMcpServerInstance.findRequestLogs.useQuery(
      { instanceId },
      { enabled: !!instanceId },
    );

  // ツール統計を取得
  const { data: toolStats } = api.userMcpServerInstance.getToolStats.useQuery(
    { instanceId },
    { enabled: !!instanceId },
  );

  const { mutate: updateStatus, isPending: isStatusUpdating } =
    api.userMcpServerInstance.updateServerStatus.useMutation({
      onSuccess: async () => {
        toast.success("サーバーステータスを更新しました");
        await refetch();
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const handleStatusToggle = (checked: boolean) => {
    if (!instance) return;
    const newStatus = checked ? ServerStatus.RUNNING : ServerStatus.STOPPED;
    updateStatus({
      id: instance.id,
      serverStatus: newStatus,
    });
  };

  // 公式MCPサーバーの詳細な概要を取得
  const getServerDescription = (
    serverName: string,
    description: string | null,
  ) => {
    if (!instance || instance.serverType === ServerType.CUSTOM) {
      return description ?? "カスタムMCPサーバー";
    }

    // 公式サーバーの場合、constants から説明を取得
    return getMcpServerDescription(serverName);
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
            <div className="hidden items-center space-x-2 sm:flex">
              <div className="h-8 w-16 animate-pulse rounded bg-gray-200"></div>
              <div className="h-8 w-16 animate-pulse rounded bg-gray-200"></div>
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
                    <div className="flex space-x-4">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Skeleton */}
          <div className="space-y-4">
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 w-full animate-pulse rounded-lg bg-gray-200"></div>
              <div className="h-32 w-full animate-pulse rounded-lg bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <header className="mb-6 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
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
                  onClick={() => router.back()}
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
            onClick={() => router.back()}
            className="mr-4"
            aria-label="前のページに戻る"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="truncate text-2xl font-bold">{instance.name}</h1>
        </header>

        {/* Server Info Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border bg-gray-50">
                  {instance.iconPath ? (
                    <Image
                      src={instance.iconPath}
                      alt={instance.name}
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                  ) : (
                    <FaviconImage
                      url={instance.mcpServerUrl}
                      alt={instance.name}
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
                      {getStatusBadge(instance.serverStatus)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {instance.serverStatus === ServerStatus.RUNNING
                            ? "実行中"
                            : "停止中"}
                        </span>
                        <Switch
                          checked={
                            instance.serverStatus === ServerStatus.RUNNING
                          }
                          onCheckedChange={handleStatusToggle}
                          disabled={isStatusUpdating}
                          className={cn(
                            "data-[state=checked]:bg-green-500",
                            "data-[state=unchecked]:bg-gray-300",
                            "dark:data-[state=unchecked]:bg-gray-600",
                          )}
                          aria-label={
                            instance.serverStatus === ServerStatus.RUNNING
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
                  <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-line text-gray-600">
                    {getServerDescription(instance.name, instance.description)}
                  </p>
                  <div className="mt-3 flex flex-col space-y-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
                    <div className="flex items-center space-x-1">
                      <Wrench className="h-3 w-3" />
                      <span>ツール</span>
                      <span className="font-medium">
                        {instance.toolGroup?.toolGroupTools?.length ?? 0}個
                      </span>
                    </div>
                    <span className="flex items-center">
                      作成日:{" "}
                      {new Date(instance.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                    <span className="flex items-center">
                      最終更新:{" "}
                      {new Date(instance.updatedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
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
              icon: <FileText className="h-4 w-4" />,
            },
            {
              id: "logs-analytics",
              label: "ログ・分析",
              icon: <BarChart3 className="h-4 w-4" />,
            },
          ]}
          defaultTab="overview"
        >
          {(activeTab) => (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  instance={instance}
                  requestStats={requestStats}
                  toolStats={toolStats}
                  onRefresh={async () => {
                    await refetch();
                  }}
                />
              )}
              {activeTab === "logs-analytics" && (
                <LogsAnalyticsTab
                  requestStats={requestStats}
                  requestLogs={requestLogs}
                  refetchLogs={refetchLogs}
                />
              )}
            </>
          )}
        </CustomTabs>

        {/* Dialogs */}
        {showEditDialog && (
          <EditServerDialog
            instance={instance}
            onClose={() => setShowEditDialog(false)}
            onSuccess={async () => {
              await refetch();
            }}
          />
        )}
        {showDeleteDialog && (
          <DeleteServerDialog
            instance={instance}
            onClose={() => setShowDeleteDialog(false)}
          />
        )}
      </div>
    </div>
  );
};
