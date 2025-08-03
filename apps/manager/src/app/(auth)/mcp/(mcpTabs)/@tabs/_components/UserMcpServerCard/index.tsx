"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import {
  Trash2Icon,
  ImageIcon,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Wrench,
  RefreshCw,
  Edit2,
  Shield,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { ToolsModal } from "../ToolsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { ImageEditModal } from "./ImageEditModal";
import { NameEditModal } from "./NameEditModal";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { makeHttpProxyServerUrl, makeSseProxyServerUrl } from "@/utils/url";
import { toast } from "@/utils/client/toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { debounce } from "@tumiki/utils/client";

import { type RouterOutputs, api } from "@/trpc/react";
import { SERVER_STATUS_LABELS } from "@/constants/userMcpServer";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { FaviconImage } from "@/components/ui/FaviconImage";
import { getMcpServerData } from "@/constants/mcpServerDescriptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findOfficialServers"][number];

type UserMcpServerCardProps = {
  serverInstance: ServerInstance;
  revalidate?: () => Promise<void>;
  isSortMode?: boolean;
};

export const UserMcpServerCard = ({
  serverInstance,
  revalidate,
  isSortMode = false,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  // const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false);
  const [nameEditModalOpen, setNameEditModalOpen] = useState(false);
  const [securityScanResult, setSecurityScanResult] = useState<{
    success: boolean;
    issues: Array<{
      code?: string;
      message?: string;
      extraData?: Record<string, unknown>;
    }>;
    error?: string;
  } | null>(null);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [showScanResultModal, setShowScanResultModal] = useState(false);

  const { tools } = serverInstance;

  const apiKey = serverInstance.apiKeys[0]?.apiKey ?? "";

  const { mutate: updateStatus, isPending: isStatusUpdating } =
    api.userMcpServerInstance.updateServerStatus.useMutation({
      onSuccess: async () => {
        toast.success("サーバーステータスを更新しました");
        await revalidate?.();
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const { mutate: scanServer, isPending: isScanning } =
    api.userMcpServerInstance.checkServerConnection.useMutation({
      onSuccess: async (result) => {
        // セキュリティスキャン結果がある場合は保存
        if (result.securityScan) {
          setSecurityScanResult(result.securityScan);
        }

        if (result.success) {
          // 問題がある場合はモーダルを表示
          if (result.securityScan && result.securityScan.issues.length > 0) {
            setShowScanResultModal(true);
          } else {
            toast.success(`接続が正常です（ツール数: ${result.toolCount}）`);
          }
        } else {
          // エラーの場合もモーダルを表示
          setShowScanResultModal(true);
        }
        await revalidate?.();
      },
      onError: (error) => {
        toast.error(`スキャンエラー: ${error.message}`);
      },
    });

  // デバウンスされたスキャン関数を作成
  const debouncedScan = useMemo(
    () =>
      debounce(() => {
        // 既に実行中の場合はスキップ
        if (isScanning) return;

        scanServer({
          serverInstanceId: serverInstance.id,
          updateStatus: false,
        });
      }, 1000), // 1秒のデバウンス
    [serverInstance.id, scanServer, isScanning],
  );

  const handleScan = () => {
    debouncedScan();
  };

  // userMcpServersが削除されたため、プリフェッチクエリは不要

  const copyUrl = async () => {
    await copyToClipboard(makeSseProxyServerUrl(apiKey));
    toast.success("SSE URLをコピーしました");
  };

  const copyHttpUrl = async () => {
    await copyToClipboard(makeHttpProxyServerUrl(apiKey));
    toast.success("Streamable HTTP をコピーしました");
  };

  const handleStatusToggle = (checked: boolean) => {
    const newStatus = checked ? ServerStatus.RUNNING : ServerStatus.STOPPED;
    updateStatus({
      id: serverInstance.id,
      serverStatus: newStatus,
    });
  };

  const getSecurityStatusLabel = (
    result: typeof securityScanResult,
  ): string => {
    if (!result) return "";
    if (!result.success) return "スキャンエラー";
    if (result.issues.length === 0) return "問題なし";
    return `${result.issues.length}件の問題`;
  };

  const getSecurityStatusColor = (
    result: typeof securityScanResult,
  ): string => {
    if (!result) return "text-gray-500";
    if (!result.success) return "text-yellow-500";
    if (result.issues.length === 0) return "text-green-500";
    return "text-red-500";
  };

  // MCPサーバーのURLを取得（ファビコン表示用）
  const mcpServerUrl = serverInstance.mcpServer?.url;

  // サンプルカテゴリータグと説明文の生成（constantsから取得）
  const getSampleData = (serverName: string) => {
    return getMcpServerData(serverName);
  };

  const sampleData = getSampleData(serverInstance.name);
  const sampleTags = sampleData?.tags ?? [];
  const sampleDescription =
    sampleData?.description ?? "このMCPサーバーの説明は設定されていません。";

  const handleCardClick = () => {
    if (isSortMode) return; // ソートモード時はクリック無効
    window.location.href = `/mcp/${serverInstance.serverType === ServerType.OFFICIAL ? "servers" : "custom-servers"}/${serverInstance.id}`;
  };

  return (
    <>
      <Card
        className={cn(
          "flex h-full flex-col transition-all duration-200",
          !isSortMode &&
            "cursor-pointer hover:-translate-y-1 hover:bg-gray-50/50 hover:shadow-lg",
          isSortMode &&
            "cursor-grab border-2 border-dashed border-blue-300 bg-blue-50/30 select-none",
          isScanning && "relative overflow-hidden",
          // セキュリティ問題がある場合のスタイル
          securityScanResult &&
            !securityScanResult.success &&
            "border-yellow-300 bg-yellow-50/10",
          securityScanResult &&
            securityScanResult.success &&
            securityScanResult.issues.length > 0 &&
            "border-red-300 bg-red-50/10",
        )}
        onClick={handleCardClick}
      >
        {/* 接続テスト中のローディングオーバーレイ */}
        {isScanning && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                接続テスト中...
              </span>
            </div>
          </div>
        )}
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          {/* セキュリティ警告アイコン */}
          {securityScanResult && securityScanResult.issues.length > 0 && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="relative">
                <AlertTriangle
                  className={cn(
                    "h-5 w-5",
                    !securityScanResult.success
                      ? "text-yellow-600"
                      : "text-red-600",
                  )}
                />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      !securityScanResult.success
                        ? "bg-yellow-400"
                        : "bg-red-400",
                    )}
                  ></span>
                  <span
                    className={cn(
                      "relative inline-flex h-3 w-3 rounded-full",
                      !securityScanResult.success
                        ? "bg-yellow-500"
                        : "bg-red-500",
                    )}
                  ></span>
                </span>
              </div>
            </div>
          )}
          <div className="group relative mr-2 rounded-md p-2">
            {serverInstance.iconPath || serverInstance.mcpServer?.iconPath ? (
              <Image
                src={
                  serverInstance.iconPath ??
                  serverInstance.mcpServer?.iconPath ??
                  "/placeholder.svg"
                }
                alt={serverInstance.name}
                width={32}
                height={32}
              />
            ) : (
              <FaviconImage
                url={mcpServerUrl}
                alt={serverInstance.name}
                size={32}
                fallback={
                  <div className="flex size-6 items-center justify-center rounded-md bg-gray-200">
                    <ImageIcon className="size-4 text-gray-500" />
                  </div>
                }
              />
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
            <div className="group flex items-center">
              <CardTitle className="text-lg font-semibold">
                {serverInstance.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setNameEditModalOpen(true);
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="mt-1">
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-muted-foreground flex-shrink-0 text-xs">
                  SSE:
                </span>
                <span
                  className="cursor-pointer truncate font-mono text-sm text-blue-600 underline hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyUrl();
                  }}
                >
                  {makeSseProxyServerUrl(apiKey)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-pointer hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyUrl();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-muted-foreground flex-shrink-0 text-xs">
                  HTTP:
                </span>
                <span
                  className="cursor-pointer truncate font-mono text-sm text-blue-600 underline hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyHttpUrl();
                  }}
                >
                  {makeHttpProxyServerUrl(apiKey)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-pointer hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyHttpUrl();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          {!isSortMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 hover:bg-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">メニューを開く</span>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/mcp/${serverInstance.serverType === ServerType.OFFICIAL ? "servers" : "custom-servers"}/${serverInstance.id}`}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    詳細を見る
                  </Link>
                </DropdownMenuItem>
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
                    handleScan();
                  }}
                  disabled={isScanning}
                >
                  <RefreshCw
                    className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")}
                  />
                  接続テスト
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
          )}
          {isSortMode && (
            <div className="flex size-6 items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                ドラッグ
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {/* ステータスとツール数の横並び */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isScanning && "animate-pulse",
                  serverInstance.serverStatus === ServerStatus.RUNNING
                    ? "bg-green-500"
                    : serverInstance.serverStatus === ServerStatus.STOPPED
                      ? "bg-gray-500"
                      : serverInstance.serverStatus === ServerStatus.PENDING
                        ? "bg-yellow-500"
                        : "bg-red-500",
                )}
              />
              <span className="text-sm">
                {isScanning
                  ? "接続テスト中"
                  : SERVER_STATUS_LABELS[serverInstance.serverStatus]}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Wrench className="h-4 w-4" />
                ツール
                <span>{tools.length}個</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={serverInstance.serverStatus === ServerStatus.RUNNING}
                  onCheckedChange={handleStatusToggle}
                  disabled={isStatusUpdating || isScanning}
                  className={cn(
                    "data-[state=checked]:bg-green-500",
                    "data-[state=unchecked]:bg-gray-300",
                    "dark:data-[state=unchecked]:bg-gray-600",
                    (isStatusUpdating || isScanning) && "opacity-50",
                  )}
                />
              </div>
            </div>
          </div>

          {/* MCPサーバーの概要 */}
          <div>
            <p className="text-sm text-gray-600">{sampleDescription}</p>
          </div>

          {/* カテゴリータグ（カード下部） */}
          <div className="flex flex-wrap gap-1 pt-2">
            {sampleTags.map((tag, index) => (
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

        {/* セキュリティスキャン結果表示 */}
        {securityScanResult && (
          <div
            className={cn(
              "space-y-2 border-t px-4 py-3",
              !securityScanResult.success && "border-t-yellow-300 bg-yellow-50",
              securityScanResult.success &&
                securityScanResult.issues.length > 0 &&
                "border-t-red-300 bg-red-50",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield
                  className={cn(
                    "h-4 w-4",
                    getSecurityStatusColor(securityScanResult),
                  )}
                />
                <span className="text-sm font-medium">
                  セキュリティスキャン:{" "}
                  {getSecurityStatusLabel(securityScanResult)}
                </span>
              </div>
              {(securityScanResult.issues.length > 0 ||
                securityScanResult.error) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSecurityDetails(!showSecurityDetails);
                  }}
                >
                  {showSecurityDetails ? "詳細を隠す" : "詳細を表示"}
                </Button>
              )}
            </div>

            {showSecurityDetails && (
              <div className="space-y-2 rounded-md bg-gray-50 p-3">
                {securityScanResult.error && (
                  <div className="text-sm text-red-600">
                    <p className="font-medium">
                      エラー: {securityScanResult.error}
                    </p>
                  </div>
                )}
                {securityScanResult.issues.length > 0 && (
                  <div className="space-y-2">
                    {securityScanResult.issues.map((issue, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "inline-block rounded px-2 py-0.5 text-xs font-medium",
                              // コードに応じた色分け
                              issue.code === "TF001" &&
                                "bg-red-100 text-red-800",
                              issue.code === "scan_timeout" &&
                                "bg-orange-100 text-orange-800",
                              issue.code === "scan_error" &&
                                "bg-red-100 text-red-800",
                              issue.code === "invalid_output" &&
                                "bg-purple-100 text-purple-800",
                              issue.code === "parse_error" &&
                                "bg-purple-100 text-purple-800",
                              // デフォルト
                              !issue.code?.match(
                                /^(TF001|scan_timeout|scan_error|invalid_output|parse_error)$/,
                              ) && "bg-yellow-100 text-yellow-800",
                            )}
                          >
                            {issue.code ?? "UNKNOWN"}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">
                              {issue.message ?? "不明な問題"}
                            </p>
                            {issue.extraData && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                                  詳細情報を表示
                                </summary>
                                <div className="mt-2 rounded-md bg-gray-100 p-3">
                                  {/* その他の場合は通常のJSON表示 */}
                                  <pre className="overflow-auto text-xs text-gray-600">
                                    {JSON.stringify(issue.extraData, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* <CardFooter className="mt-auto">
        <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          再設定
        </Button>
      </CardFooter> */}
      </Card>

      {/* トークンモーダル */}
      {/* {tokenModalOpen && (
        <UserMcpServerConfigModal
          onOpenChange={setTokenModalOpen}
          mcpServer={serverInstance}
          userMcpServerId={serverInstance.id}
          mode="edit"
        />
      )} */}

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={serverInstance.name}
        tools={[]} // 簡素化されたデータ構造では詳細なツール情報は利用できない
      />

      {/* 削除確認モーダル */}
      {deleteModalOpen && (
        <DeleteConfirmModal
          open={deleteModalOpen}
          serverInstanceId={serverInstance.id}
          serverName={serverInstance.name}
          onOpenChange={setDeleteModalOpen}
          onSuccess={async () => {
            await revalidate?.();
            setDeleteModalOpen(false);
          }}
        />
      )}

      {/* 画像編集モーダル */}
      {/* TODO: 画像編集モーダルを実装する */}
      {imageEditModalOpen && (
        <ImageEditModal
          open={imageEditModalOpen}
          userMcpServerId={serverInstance.id}
          initialImageUrl={serverInstance.iconPath ?? ""}
          onOpenChange={setImageEditModalOpen}
        />
      )}

      {/* 名前編集モーダル */}
      {nameEditModalOpen && (
        <NameEditModal
          serverInstanceId={serverInstance.id}
          initialName={serverInstance.name}
          onSuccess={async () => {
            await revalidate?.();
            setNameEditModalOpen(false);
          }}
          onOpenChange={setNameEditModalOpen}
        />
      )}

      {/* セキュリティスキャン結果モーダル */}
      <Dialog open={showScanResultModal} onOpenChange={setShowScanResultModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Shield className="h-5 w-5" />
              セキュリティスキャン結果
            </DialogTitle>
          </DialogHeader>

          {securityScanResult && (
            <div className="mt-4 space-y-4">
              {/* スキャンエラーの場合 */}
              {!securityScanResult.success && (
                <Alert className="border-yellow-300 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <p className="font-medium">スキャンエラー</p>
                    <p className="mt-1 text-sm">
                      {securityScanResult.error ??
                        "セキュリティスキャンの実行中にエラーが発生しました"}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* セキュリティ問題が見つかった場合 */}
              {securityScanResult.success &&
                securityScanResult.issues.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">
                        {securityScanResult.issues.length}
                        件のセキュリティ問題が検出されました
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

              {/* 問題の詳細リスト */}
              {securityScanResult.issues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">検出された問題:</h3>
                  {securityScanResult.issues.map((issue, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-lg border p-4"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "inline-block rounded px-2 py-0.5 text-xs font-medium",
                            issue.code === "TF001" && "bg-red-100 text-red-800",
                            issue.code === "scan_timeout" &&
                              "bg-orange-100 text-orange-800",
                            issue.code === "scan_error" &&
                              "bg-red-100 text-red-800",
                            issue.code === "invalid_output" &&
                              "bg-purple-100 text-purple-800",
                            issue.code === "parse_error" &&
                              "bg-purple-100 text-purple-800",
                            !issue.code?.match(
                              /^(TF001|scan_timeout|scan_error|invalid_output|parse_error)$/,
                            ) && "bg-yellow-100 text-yellow-800",
                          )}
                        >
                          {issue.code ?? "UNKNOWN"}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {issue.message ?? "不明な問題"}
                          </p>
                        </div>
                      </div>

                      {issue.extraData && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                            詳細情報を表示
                          </summary>
                          <div className="mt-2 rounded-md bg-gray-100 p-3">
                            <pre className="overflow-auto text-xs text-gray-600">
                              {JSON.stringify(issue.extraData, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowScanResultModal(false)}
                >
                  閉じる
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
