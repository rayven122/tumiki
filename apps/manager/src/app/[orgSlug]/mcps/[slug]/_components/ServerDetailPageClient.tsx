"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Cable,
  Edit2,
  Info,
  MoreVertical,
  Palette,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Shrink,
  Trash2,
  Workflow,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AUTH_TYPE_LABELS } from "@/constants/userMcpServer";
import { cn } from "@/lib/utils";
import type { McpServerId } from "@/schema/ids";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { AuthType, ServerStatus, ServerType } from "@tumiki/db/prisma";
import { ConnectionTab } from "./ConnectionTab";
import { CustomTabs } from "./CustomTabs";
import { DeleteServerDialog } from "./DeleteServerDialog";
import { LogsAnalyticsTab } from "./LogsAnalyticsTab";
import { OverviewTab } from "./OverviewTab";
import { McpServerIcon } from "../../_components/McpServerIcon";
import { IconEditModal } from "../../_components/UserMcpServerCard/IconEditModal";
import { useReauthenticateOAuth } from "../../_components/UserMcpServerCard/hooks/useReauthenticateOAuth";
import { McpConfigEditModal } from "./McpConfigEditModal";
import { Switch } from "@/components/ui/switch";
import { RefreshToolsModal } from "../../_components/RefreshToolsModal";

// サーバータイプのラベル
const SERVER_TYPE_LABELS = {
  [ServerType.OFFICIAL]: "公式",
  [ServerType.CUSTOM]: "カスタム",
} as const;

type ServerDetailPageClientProps = {
  orgSlug: string;
  serverSlug: string;
};

export const ServerDetailPageClient = ({
  orgSlug,
  serverSlug,
}: ServerDetailPageClientProps) => {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showIconEditModal, setShowIconEditModal] = useState(false);
  const [showMcpConfigModal, setShowMcpConfigModal] = useState(false);
  const [showRefreshToolsModal, setShowRefreshToolsModal] = useState(false);
  const [selectedAuthType, setSelectedAuthType] = useState<AuthType | null>(
    null,
  );

  const {
    data: server,
    isLoading,
    refetch,
  } = api.userMcpServer.findBySlug.useQuery(
    { slug: serverSlug },
    { enabled: !!serverSlug },
  );

  // リクエスト統計情報を取得（サーバーデータ取得後にIDで検索）
  const { data: requestStats } =
    api.userMcpServerRequestLog.getRequestStats.useQuery(
      { userMcpServerId: server?.id as McpServerId },
      { enabled: !!server?.id },
    );

  const { mutate: updateStatus, isPending: isStatusUpdating } =
    api.userMcpServer.updateServerStatus.useMutation({
      onSuccess: async () => {
        toast.success("MCPサーバーのステータスを更新しました");
        await refetch();
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  // PIIマスキング設定更新
  const utils = api.useUtils();
  const { mutate: updatePiiMasking } =
    api.userMcpServer.updatePiiMasking.useMutation({
      // 楽観的更新
      onMutate: async (variables) => {
        await utils.userMcpServer.findBySlug.cancel({
          slug: serverSlug,
        });
        const previousData = utils.userMcpServer.findBySlug.getData({
          slug: serverSlug,
        });
        if (previousData) {
          utils.userMcpServer.findBySlug.setData(
            { slug: serverSlug },
            { ...previousData, piiMaskingEnabled: variables.piiMaskingEnabled },
          );
        }
        return { previousData };
      },
      onSuccess: () => {
        toast.success("マスキング設定を更新しました");
      },
      onError: (error, _variables, context) => {
        if (context?.previousData) {
          utils.userMcpServer.findBySlug.setData(
            { slug: serverSlug },
            context.previousData,
          );
        }
        toast.error(`エラーが発生しました: ${error.message}`);
      },
      onSettled: async () => {
        await utils.userMcpServer.findBySlug.invalidate({
          slug: serverSlug,
        });
      },
    });

  const handlePiiMaskingToggle = (checked: boolean) => {
    if (!server) return;
    updatePiiMasking({
      id: server.id as McpServerId,
      piiMaskingEnabled: checked,
    });
  };

  // TOON変換設定更新
  const { mutate: updateToonConversion } =
    api.userMcpServer.updateToonConversion.useMutation({
      // 楽観的更新
      onMutate: async (variables) => {
        await utils.userMcpServer.findBySlug.cancel({
          slug: serverSlug,
        });
        const previousData = utils.userMcpServer.findBySlug.getData({
          slug: serverSlug,
        });
        if (previousData) {
          utils.userMcpServer.findBySlug.setData(
            { slug: serverSlug },
            {
              ...previousData,
              toonConversionEnabled: variables.toonConversionEnabled,
            },
          );
        }
        return { previousData };
      },
      onSuccess: () => {
        toast.success("データ圧縮設定を更新しました");
      },
      onError: (error, _variables, context) => {
        if (context?.previousData) {
          utils.userMcpServer.findBySlug.setData(
            { slug: serverSlug },
            context.previousData,
          );
        }
        toast.error(`エラーが発生しました: ${error.message}`);
      },
      onSettled: async () => {
        await utils.userMcpServer.findBySlug.invalidate({
          slug: serverSlug,
        });
      },
    });

  const handleToonConversionToggle = (checked: boolean) => {
    if (!server) return;
    updateToonConversion({
      id: server.id as McpServerId,
      toonConversionEnabled: checked,
    });
  };

  // ツール動的取得設定更新
  const { mutate: updateDynamicSearch } =
    api.userMcpServer.updateDynamicSearch.useMutation({
      onSuccess: () => {
        toast.success("ツール動的取得設定を更新しました");
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
      onSettled: async () => {
        await utils.userMcpServer.findBySlug.invalidate({
          slug: serverSlug,
        });
      },
    });

  const handleDynamicSearchToggle = (checked: boolean) => {
    if (!server) return;
    updateDynamicSearch({
      id: server.id as McpServerId,
      dynamicSearchEnabled: checked,
    });
  };

  // APIキー一覧取得（表示用）
  const { data: apiKeys } = api.mcpServerAuth.listApiKeys.useQuery(
    { serverId: server?.id as McpServerId },
    {
      enabled: !!server && server.authType === AuthType.API_KEY,
    },
  );

  const handleStatusToggle = (checked: boolean) => {
    if (!server) return;
    updateStatus({
      id: server.id as McpServerId,
      isEnabled: checked,
    });
  };

  // サーバー情報が取得できたら認証タイプを初期化
  if (server && selectedAuthType === null) {
    setSelectedAuthType(server.authType);
  }

  // 有効なAPIキーの数を計算
  const activeApiKeysCount = apiKeys?.filter((key) => key.isActive).length ?? 0;

  // 最初のテンプレートインスタンスを取得（OAuth再認証用・アイコンフォールバック用）
  const firstTemplateInstance = server?.templateInstances[0];

  // OAuthテンプレートサーバーかどうかを判定
  const isOAuthTemplateServer =
    firstTemplateInstance?.mcpServerTemplate?.authType === "OAUTH";

  // API設定編集可能なインスタンス（envVarKeysがあるもの）を取得
  const editableInstances =
    server?.templateInstances.filter(
      (instance) =>
        (instance.mcpServerTemplate.envVarKeys?.length ?? 0) > 0 &&
        instance.mcpServerTemplate.authType !== "OAUTH",
    ) ?? [];

  // OAuth再認証フック
  const { handleReauthenticate, isPending: isReauthenticating } =
    useReauthenticateOAuth({
      mcpServerTemplateInstanceId: firstTemplateInstance?.id ?? "",
    });

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
                  <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-gray-200"></div>
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
                    指定されたサーバーが存在しないか、アクセス権限がありません。
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
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-gray-50">
                    <McpServerIcon
                      iconPath={
                        server.iconPath ??
                        server.templateInstances[0]?.mcpServerTemplate?.iconPath
                      }
                      fallbackUrl={
                        server.templateInstances[0]?.mcpServerTemplate?.url
                      }
                      alt={server.name}
                      size={48}
                    />
                  </div>

                  {/* サーバー情報 */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* 説明 */}
                    <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-line text-gray-600">
                      {server.description}
                    </p>

                    {/* メタ情報（1行目） */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {/* ツール情報 */}
                      {server.serverType === ServerType.OFFICIAL ? (
                        // OFFICIAL: 単一のツール数
                        <div className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>ツール</span>
                          <span className="font-medium">
                            {server.templateInstances[0]?.tools.length ?? 0}個
                          </span>
                        </div>
                      ) : (
                        // CUSTOM: 各インスタンスごとのツール数
                        <div className="flex flex-wrap items-center gap-2">
                          <Wrench className="h-3 w-3" />
                          <span>ツール:</span>
                          {server.templateInstances.map((instance, index) => (
                            <div
                              key={instance.id}
                              className="flex items-center"
                            >
                              <span className="font-medium">
                                {instance.mcpServerTemplate.name}(
                                {instance.tools.length}個)
                              </span>
                              {index < server.templateInstances.length - 1 && (
                                <span className="mx-1">|</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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

                      {/* ツール動的取得 */}
                      <div className="flex items-center gap-1.5">
                        <Search className="h-3 w-3 text-indigo-600" />
                        <span>動的取得:</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex cursor-help text-gray-400 hover:text-gray-600"
                              aria-label="ツール動的取得について"
                            >
                              <Info className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-left"
                          >
                            全ツール定義の代わりに3つのメタツールのみをAIに公開。コンテキスト量を大幅に削減し、AIの応答速度とコストを改善します
                          </TooltipContent>
                        </Tooltip>
                        <Switch
                          checked={server.dynamicSearch ?? false}
                          onCheckedChange={handleDynamicSearchToggle}
                          className="h-4 w-7 data-[state=checked]:bg-indigo-500 [&>span]:h-3 [&>span]:w-3"
                          aria-label={
                            server.dynamicSearch
                              ? "ツール動的取得を無効にする"
                              : "ツール動的取得を有効にする"
                          }
                        />
                      </div>

                      {/* データ圧縮 */}
                      <div className="flex items-center gap-1.5">
                        <Shrink className="h-3 w-3 text-amber-600" />
                        <span>データ圧縮:</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex cursor-help text-gray-400 hover:text-gray-600"
                              aria-label="データ圧縮について"
                            >
                              <Info className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-left"
                          >
                            レスポンスをTOON形式に変換し、AIへのトークン量を30〜60%削減します。特に配列データで効果的です
                          </TooltipContent>
                        </Tooltip>
                        <Switch
                          checked={server.toonConversionEnabled}
                          onCheckedChange={handleToonConversionToggle}
                          className="h-4 w-7 data-[state=checked]:bg-amber-500 [&>span]:h-3 [&>span]:w-3"
                          aria-label={
                            server.toonConversionEnabled
                              ? "データ圧縮を無効にする"
                              : "データ圧縮を有効にする"
                          }
                        />
                      </div>

                      {/* マスキング */}
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>マスキング:</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex cursor-help text-gray-400 hover:text-gray-600"
                              aria-label="マスキングについて"
                            >
                              <Info className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-left"
                          >
                            リクエスト・レスポンスに含まれる個人情報（メールアドレス、電話番号など）を自動マスキングし、AIやMCPサーバーに意図せず個人情報が渡ることを防ぎます
                          </TooltipContent>
                        </Tooltip>
                        <Switch
                          checked={server.piiMaskingEnabled}
                          onCheckedChange={handlePiiMaskingToggle}
                          className="h-4 w-7 data-[state=checked]:bg-emerald-500 [&>span]:h-3 [&>span]:w-3"
                          aria-label={
                            server.piiMaskingEnabled
                              ? "マスキングを無効にする"
                              : "マスキングを有効にする"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右側: スイッチ + メニュー */}
                <div className="flex shrink-0 items-center gap-2">
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
                      {/* OAuthサーバーの場合は再認証オプションを表示 */}
                      {isOAuthTemplateServer && (
                        <DropdownMenuItem
                          onClick={() => void handleReauthenticate()}
                          disabled={isReauthenticating}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          再認証
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setShowRefreshToolsModal(true)}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        ツールを更新
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowIconEditModal(true)}
                      >
                        <Palette className="mr-2 h-4 w-4" />
                        アイコンを変更
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowMcpConfigModal(true)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
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
            switch (activeTab) {
              case "overview":
                return (
                  <OverviewTab
                    server={server}
                    requestStats={requestStats}
                    serverId={server.id as McpServerId}
                  />
                );
              case "connection":
                return (
                  <ConnectionTab
                    server={server}
                    serverId={server.id as McpServerId}
                  />
                );
              case "logs":
                return (
                  <LogsAnalyticsTab
                    serverId={server.id as McpServerId}
                    requestStats={requestStats}
                  />
                );
              default:
                return null;
            }
          }}
        </CustomTabs>

        {/* Dialogs */}
        {showDeleteDialog && (
          <DeleteServerDialog
            server={server}
            orgSlug={orgSlug}
            onClose={() => setShowDeleteDialog(false)}
          />
        )}
        {showIconEditModal && (
          <IconEditModal
            serverInstanceId={server.id as McpServerId}
            initialIconPath={server.iconPath}
            fallbackUrl={firstTemplateInstance?.mcpServerTemplate?.url}
            orgSlug={orgSlug}
            onSuccess={async () => {
              await refetch();
              setShowIconEditModal(false);
            }}
            onOpenChange={setShowIconEditModal}
          />
        )}
        {showMcpConfigModal && (
          <McpConfigEditModal
            open={showMcpConfigModal}
            onOpenChange={setShowMcpConfigModal}
            serverId={server.id as McpServerId}
            initialServerName={server.name}
            templateInstanceId={editableInstances[0]?.id ?? null}
            templateName={editableInstances[0]?.mcpServerTemplate.name ?? ""}
            editableInstances={editableInstances.map((instance) => ({
              id: instance.id,
              name: instance.mcpServerTemplate.name,
              iconPath: instance.mcpServerTemplate.iconPath,
              url: instance.mcpServerTemplate.url,
            }))}
            onSuccess={async () => {
              await refetch();
            }}
          />
        )}
        {showRefreshToolsModal && (
          <RefreshToolsModal
            open={showRefreshToolsModal}
            onOpenChange={setShowRefreshToolsModal}
            serverId={server.id as McpServerId}
            serverName={server.name}
            onSuccess={async () => {
              await refetch();
            }}
          />
        )}
      </div>
    </div>
  );
};
