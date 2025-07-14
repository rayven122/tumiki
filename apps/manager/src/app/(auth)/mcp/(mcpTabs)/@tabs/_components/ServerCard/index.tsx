"use client";

import { Button } from "@/components/ui/button";
import type React from "react";
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
import { UserMcpServerConfigModal } from "../UserMcpServerConfigModal";
import { Server, Wrench } from "lucide-react";
import { ToolsModal } from "../ToolsModal";
import type { Prisma } from "@tumiki/db/prisma";
import { FaviconImage } from "@/components/ui/FaviconImage";

type McpServerWithTools = Prisma.McpServerGetPayload<{
  include: { tools: true };
}>;

type ServerCardProps = {
  mcpServer: McpServerWithTools;
};

export function ServerCard({ mcpServer }: ServerCardProps) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);

  // サンプル認証タイプの判定（後でDBから取得予定）
  const getAuthType = (serverName: string) => {
    const authTypes: Record<
      string,
      { type: string; color: string; bgColor: string }
    > = {
      // OAuth認証が必要
      GitHub: {
        type: "OAuth",
        color: "text-green-800",
        bgColor: "bg-green-100",
      },
      Slack: {
        type: "OAuth",
        color: "text-green-800",
        bgColor: "bg-green-100",
      },
      Discord: {
        type: "OAuth",
        color: "text-green-800",
        bgColor: "bg-green-100",
      },
      "Google Drive": {
        type: "OAuth",
        color: "text-green-800",
        bgColor: "bg-green-100",
      },
      Figma: {
        type: "OAuth",
        color: "text-green-800",
        bgColor: "bg-green-100",
      },

      // API Key入力が必要
      Notion: {
        type: "API Key",
        color: "text-blue-800",
        bgColor: "bg-blue-100",
      },
      Jira: { type: "API Key", color: "text-blue-800", bgColor: "bg-blue-100" },
      AWS: { type: "API Key", color: "text-blue-800", bgColor: "bg-blue-100" },
      PostgreSQL: {
        type: "API Key",
        color: "text-blue-800",
        bgColor: "bg-blue-100",
      },

      // すぐに追加可能
      Docker: {
        type: "設定不要",
        color: "text-purple-800",
        bgColor: "bg-purple-100",
      },
      System: {
        type: "設定不要",
        color: "text-purple-800",
        bgColor: "bg-purple-100",
      },
    };

    const matchedKey = Object.keys(authTypes).find((key) =>
      serverName.toLowerCase().includes(key.toLowerCase()),
    );
    return matchedKey
      ? authTypes[matchedKey]
      : {
          type: "設定不要",
          color: "text-purple-800",
          bgColor: "bg-purple-100",
        };
  };

  const authInfo = getAuthType(mcpServer.name) ?? {
    type: "設定",
    color: "text-gray-800",
    bgColor: "bg-gray-100",
  };

  // サンプル概要文の生成（後でDBから取得予定）
  const getSampleDescription = (serverName: string) => {
    const descriptions: Record<string, string> = {
      GitHub:
        "GitHubリポジトリの管理、イシューの作成・更新、プルリクエストの操作など、開発ワークフローを効率化します。",
      Slack:
        "Slackチャンネルへのメッセージ送信、通知の管理、チームメンバーとのリアルタイムコミュニケーションを支援します。",
      Notion:
        "Notionページの作成・編集、データベースの操作、プロジェクト情報の管理を自動化します。",
      "Google Drive":
        "Google Driveのファイル・フォルダ管理、共有設定、ドキュメントの作成・編集機能を提供します。",
      Jira: "Jiraチケットの作成・更新、プロジェクト進捗の追跡、アジャイル開発のサポートを行います。",
      Discord:
        "Discordサーバーでのメッセージ送信、チャンネル管理、ボット機能による自動化を実現します。",
      Figma:
        "Figmaデザインファイルの管理、コメント機能、デザインシステムとの連携をサポートします。",
      AWS: "AWSリソースの監視・管理、EC2インスタンスの操作、クラウドインフラの自動化を提供します。",
      Docker:
        "Dockerコンテナの管理、イメージのビルド・デプロイ、開発環境の構築を自動化します。",
      PostgreSQL:
        "PostgreSQLデータベースへのクエリ実行、データの取得・更新、スキーマ管理を行います。",
      Neon: "サーバーレスPostgreSQLデータベースの管理、スケーラブルなデータベース操作、開発・本番環境の分離管理を提供します。",
      Playwright:
        "ブラウザ自動化によるウェブページ操作、スクリーンショット取得、フォーム入力、複数ブラウザでの動作テストを実行します。",
      Context7:
        "最新ライブラリのドキュメントとコード例を迅速に取得する強力なツールです。古い情報に頼らず、効率的で正確なプログラミングをサポートします。",
    };

    const matchedKey = Object.keys(descriptions).find((key) =>
      serverName.toLowerCase().includes(key.toLowerCase()),
    );
    return matchedKey
      ? descriptions[matchedKey]
      : "このMCPサーバーは様々な機能を提供し、AIとの連携を通じてワークフローの自動化をサポートします。";
  };

  const sampleDescription = getSampleDescription(mcpServer.name);

  // サンプルカテゴリータグの生成（後でDBから取得予定）
  const getSampleTags = (serverName: string) => {
    const tagsMap: Record<string, string[]> = {
      GitHub: ["開発", "バージョン管理"],
      Slack: ["コミュニケーション", "通知"],
      Notion: ["ドキュメント", "プロジェクト管理"],
      "Google Drive": ["ファイル管理", "ストレージ"],
      Jira: ["プロジェクト管理", "タスク"],
      Discord: ["コミュニケーション", "チーム"],
      Figma: ["デザイン", "UI/UX"],
      AWS: ["インフラ", "クラウド"],
      Docker: ["コンテナ", "DevOps"],
      PostgreSQL: ["データベース", "ストレージ"],
      Neon: ["データベース", "クラウド"],
      Playwright: ["テスト", "ブラウザ自動化"],
      Context7: ["開発", "ドキュメント"],
    };

    const matchedKey = Object.keys(tagsMap).find((key) =>
      serverName.toLowerCase().includes(key.toLowerCase()),
    );
    return matchedKey ? tagsMap[matchedKey] : ["ツール", "サービス"];
  };

  const sampleTags = getSampleTags(mcpServer.name) ?? [];

  return (
    <Card className="relative flex h-full flex-col">
      {/* 認証タイプタグ（右上） */}
      <div className="absolute top-2 right-2 z-10">
        <Badge
          variant="secondary"
          className={`px-2 py-1 text-xs ${authInfo.color} ${authInfo.bgColor} border-0`}
        >
          {authInfo.type}
        </Badge>
      </div>

      <CardHeader className="flex flex-row items-center space-y-0 pr-16 pb-2">
        {mcpServer.iconPath ? (
          <div className="mr-2 rounded-md p-2">
            <Image
              src={mcpServer.iconPath}
              alt={mcpServer.name}
              width={32}
              height={32}
            />
          </div>
        ) : (
          <div className="mr-2 rounded-md p-2">
            <FaviconImage
              url={mcpServer.url}
              alt={mcpServer.name}
              size={32}
              fallback={
                <div className="rounded-md bg-gradient-to-br from-blue-500 to-purple-600 p-2">
                  <div className="flex h-8 w-8 items-center justify-center">
                    <Server className="h-4 w-4 text-white" />
                  </div>
                </div>
              }
            />
          </div>
        )}
        <div className="flex-1">
          <CardTitle>{mcpServer.name}</CardTitle>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              ツール: {mcpServer.tools.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* ツール一覧を表示するボタン */}
        <Button
          variant="outline"
          size="sm"
          className="flex w-full items-center justify-between"
          onClick={() => setToolsModalOpen(true)}
        >
          <span className="flex items-center">
            <Wrench className="mr-2 size-4" />
            利用可能なツール
          </span>
          <Badge variant="secondary" className="ml-2">
            {mcpServer.tools.length}
          </Badge>
        </Button>

        {/* MCPサーバーの概要 */}
        <div>
          <p className="text-sm leading-relaxed text-gray-600">
            {sampleDescription}
          </p>
        </div>

        {/* カテゴリータグ（カード下部） */}
        <div className="flex flex-wrap gap-1 pt-2">
          {sampleTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: "#6B46C1" }}
            >
              {tag}
            </span>
          ))}
        </div>
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

      {/* MCPサーバー追加モーダル */}
      {tokenModalOpen && (
        <UserMcpServerConfigModal
          onOpenChange={setTokenModalOpen}
          mcpServer={mcpServer}
        />
      )}

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={mcpServer.name}
        tools={mcpServer.tools}
      />
    </Card>
  );
}
