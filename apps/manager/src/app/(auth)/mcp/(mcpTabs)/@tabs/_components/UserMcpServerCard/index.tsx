"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import {
  Trash2Icon,
  ImageIcon,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Wrench,
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
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { makeHttpProxyServerUrl, makeSseProxyServerUrl } from "@/utils/url";
import { toast } from "@/utils/client/toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { type RouterOutputs, api } from "@/trpc/react";
import { SERVER_STATUS_LABELS } from "@/constants/userMcpServer";
import { ServerStatus, ServerType } from "@tumiki/db/prisma";
import { FaviconImage } from "@/components/ui/FaviconImage";

type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findOfficialServers"][number];

type UserMcpServerCardProps = {
  serverInstance: ServerInstance;
  revalidate?: () => Promise<void>;
};

export const UserMcpServerCard = ({
  serverInstance,
  revalidate,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  // const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageEditModalOpen, setImageEditModalOpen] = useState(false);

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

  api.userMcpServerConfig.findServersWithTools.usePrefetchQuery({
    userMcpServerConfigIds:
      serverInstance.serverType === ServerType.OFFICIAL
        ? serverInstance.userMcpServers.map(({ id }) => id)
        : undefined,
  });

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

  // MCPサーバーのURLを取得（ファビコン表示用）
  const mcpServerUrl = serverInstance.userMcpServers[0]?.url;

  // サンプルカテゴリータグと説明文の生成（後でDBから取得予定）
  const getSampleData = (serverName: string) => {
    const dataMap: Record<string, { tags: string[]; description: string }> = {
      GitHub: {
        tags: ["開発", "バージョン管理"],
        description:
          "GitHubリポジトリの管理、イシューの作成・更新、プルリクエストの操作など、開発ワークフローを効率化します。",
      },
      Slack: {
        tags: ["コミュニケーション", "通知"],
        description:
          "Slackチャンネルへのメッセージ送信、通知の管理、チームメンバーとのリアルタイムコミュニケーションを支援します。",
      },
      Notion: {
        tags: ["ドキュメント", "プロジェクト管理"],
        description:
          "Notionページの作成・編集、データベースの操作、プロジェクト情報の管理を自動化します。",
      },
      "Google Drive": {
        tags: ["ファイル管理", "ストレージ"],
        description:
          "Google Driveのファイル・フォルダ管理、共有設定、ドキュメントの作成・編集機能を提供します。",
      },
      Jira: {
        tags: ["プロジェクト管理", "タスク"],
        description:
          "Jiraチケットの作成・更新、プロジェクト進捗の追跡、アジャイル開発のサポートを行います。",
      },
      Discord: {
        tags: ["コミュニケーション", "チーム"],
        description:
          "Discordサーバーでのメッセージ送信、チャンネル管理、ボット機能による自動化を実現します。",
      },
      Figma: {
        tags: ["デザイン", "UI/UX"],
        description:
          "Figmaデザインファイルの管理、コメント機能、デザインシステムとの連携をサポートします。",
      },
      AWS: {
        tags: ["インフラ", "クラウド"],
        description:
          "AWSリソースの監視・管理、EC2インスタンスの操作、クラウドインフラの自動化を提供します。",
      },
      Docker: {
        tags: ["コンテナ", "DevOps"],
        description:
          "Dockerコンテナの管理、イメージのビルド・デプロイ、開発環境の構築を自動化します。",
      },
      PostgreSQL: {
        tags: ["データベース", "ストレージ"],
        description:
          "PostgreSQLデータベースへのクエリ実行、データの取得・更新、スキーマ管理を行います。",
      },
    };

    // サーバー名に基づいてデータを返す、該当しない場合はデフォルト
    const matchedKey = Object.keys(dataMap).find((key) =>
      serverName.toLowerCase().includes(key.toLowerCase()),
    );
    return matchedKey
      ? dataMap[matchedKey]
      : {
          tags: ["ツール", "サービス"],
          description:
            "このMCPサーバーは様々な機能を提供し、AI との連携を通じてワークフローの自動化をサポートします。",
        };
  };

  const sampleData = getSampleData(serverInstance.name);
  const sampleTags = sampleData?.tags ?? [];
  const sampleDescription =
    sampleData?.description ?? "このMCPサーバーの説明は設定されていません。";

  const handleCardClick = () => {
    window.location.href = `/mcp/${serverInstance.serverType === ServerType.OFFICIAL ? "servers" : "custom-servers"}/${serverInstance.id}`;
  };

  return (
    <Card
      className="flex h-full cursor-pointer flex-col transition-all duration-200 hover:-translate-y-1 hover:bg-gray-50/50 hover:shadow-lg"
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="group relative mr-2 rounded-md p-2">
          {serverInstance.iconPath ? (
            <Image
              src={serverInstance.iconPath || "/placeholder.svg"}
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
          <div className="flex items-center">
            <CardTitle className="text-lg font-semibold">
              {serverInstance.name}
            </CardTitle>
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
                setDeleteModalOpen(true);
              }}
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* ステータスとツール数の横並び */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${
                serverInstance.serverStatus === ServerStatus.RUNNING
                  ? "bg-green-500"
                  : serverInstance.serverStatus === ServerStatus.STOPPED
                    ? "bg-gray-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-sm">
              {SERVER_STATUS_LABELS[serverInstance.serverStatus]}
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
                disabled={isStatusUpdating}
                className={cn(
                  "data-[state=checked]:bg-green-500",
                  "data-[state=unchecked]:bg-gray-300",
                  "dark:data-[state=unchecked]:bg-gray-600",
                )}
              />
            </div>
          </div>
        </div>

        {/* MCPサーバーの概要 */}
        <div>
          <p className="text-sm text-gray-600">
            {(serverInstance.userMcpServers.length > 0 &&
              serverInstance.userMcpServers[0] &&
              (serverInstance.userMcpServers[0] as { description?: string })
                .description) ??
              sampleDescription}
          </p>
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
        tools={tools}
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
    </Card>
  );
};
