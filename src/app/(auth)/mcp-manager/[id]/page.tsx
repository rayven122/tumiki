import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";

import { Badge } from "@/components/ui/badge";

export default async function MCPServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 実際のアプリケーションではデータベースやAPIからデータを取得します
  const server = mcpServers.find((s) => s.id === id);

  if (!server) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link
          href="/mcp-manager/servers"
          className="text-muted-foreground hover:text-foreground flex items-center text-sm"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          サーバー一覧に戻る
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-muted rounded-lg p-2">{server.icon}</div>
          <div>
            <h1 className="text-3xl font-bold">{server.name}</h1>
            <p className="text-muted-foreground">{server.description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {server.apiDocsUrl && (
            <Button variant="outline" asChild>
              <Link
                href={server.apiDocsUrl}
                target="_blank"
                className="flex items-center"
              >
                APIドキュメント
                <ExternalLink className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button variant={server.connected ? "destructive" : "default"}>
            {server.connected ? "接続解除" : "接続"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>利用可能なツール ({server.tools.length})</CardTitle>
              <CardDescription>
                このMCPサーバーで利用可能なツールの一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {server.connected ? (
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        利用可能なツールを表示 ({server.tools.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {server.icon}
                          <span>{server.name}の利用可能なツール</span>
                        </DialogTitle>
                        <DialogDescription>
                          このMCPサーバーで利用可能なツールの一覧です
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        {server.tools.map((tool) => (
                          <div key={tool.id} className="rounded-lg border p-4">
                            <h3 className="mb-1 text-lg font-medium">
                              {tool.name}
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                              {tool.description}
                            </p>
                            <div className="bg-muted inline-block rounded px-2 py-1 text-xs">
                              ソースサーバー：{tool.source}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {server.tools.slice(0, 4).map((tool) => (
                      <div key={tool.id} className="rounded border p-2">
                        <div className="truncate text-sm font-medium">
                          {tool.name}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {tool.description}
                        </div>
                      </div>
                    ))}
                    {server.tools.length > 4 && (
                      <div className="text-muted-foreground col-span-2 text-center text-sm">
                        他 {server.tools.length - 4} ツール
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    このサーバーは接続されていません
                  </p>
                  <Button>接続する</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>サーバー情報</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    ステータス
                  </dt>
                  <dd className="mt-1">
                    <Badge
                      variant={server.connected ? "default" : "secondary"}
                      className={
                        server.connected ? "bg-green-100 text-green-800" : ""
                      }
                    >
                      {server.connected ? "接続済み" : "未接続"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    ツール数
                  </dt>
                  <dd className="mt-1 text-sm">{server.tools.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    サーバーID
                  </dt>
                  <dd className="mt-1 font-mono text-sm">{server.id}</dd>
                </div>
                {/* 実際のアプリケーションではさらに詳細な情報を表示 */}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 型定義とサンプルデータ（実際のアプリケーションではデータベースやAPIから取得）
type MCPTool = {
  id: string;
  name: string;
  description: string;
  source: string;
};

type MCPServer = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  tools: MCPTool[];
  apiDocsUrl?: string;
};

const mcpServers: MCPServer[] = [
  {
    id: "slack",
    name: "Slack",
    description: "チームコミュニケーションツール",
    icon: (
      <Image
        src="/logos/slack.svg"
        alt="Slack"
        width={24}
        height={24}
        className="h-6 w-6"
      />
    ),
    connected: true,
    apiDocsUrl: "https://api.slack.com/",
    tools: [
      {
        id: "send_message",
        name: "メッセージ送信",
        description: "指定したチャンネルにメッセージを送信します",
        source: "slack",
      },
      {
        id: "create_channel",
        name: "チャンネル作成",
        description: "新しいSlackチャンネルを作成します",
        source: "slack",
      },
      {
        id: "list_channels",
        name: "チャンネル一覧取得",
        description: "ワークスペース内のチャンネル一覧を取得します",
        source: "slack",
      },
      {
        id: "upload_file",
        name: "ファイルアップロード",
        description: "指定したチャンネルにファイルをアップロードします",
        source: "slack",
      },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description: "オールインワンワークスペース",
    icon: (
      <Image
        src="/logos/notion.svg"
        alt="Notion"
        width={24}
        height={24}
        className="h-6 w-6"
      />
    ),
    connected: true,
    apiDocsUrl: "https://developers.notion.com/",
    tools: [
      {
        id: "create_page",
        name: "ページ作成",
        description: "新しいNotionページを作成します",
        source: "notion",
      },
      {
        id: "update_page",
        name: "ページ更新",
        description: "既存のNotionページを更新します",
        source: "notion",
      },
      {
        id: "search_pages",
        name: "ページ検索",
        description: "Notion内のページを検索します",
        source: "notion",
      },
      {
        id: "get_page_content",
        name: "ページ内容取得",
        description: "指定したページの内容を取得します",
        source: "notion",
      },
    ],
  },
  {
    id: "playwright",
    name: "Playwright",
    description: "モダンなWebテスト自動化フレームワーク",
    icon: (
      <Image
        src="/logos/playwright.svg"
        alt="Playwright"
        width={24}
        height={24}
        className="h-6 w-6"
      />
    ),
    connected: true,
    apiDocsUrl: "https://playwright.dev/docs/api/class-playwright",
    tools: [
      {
        id: "run_test",
        name: "テスト実行",
        description: "指定したPlaywrightテストを実行します",
        source: "playwright",
      },
      {
        id: "generate_test",
        name: "テスト生成",
        description: "新しいPlaywrightテストスクリプトを生成します",
        source: "playwright",
      },
      {
        id: "record_test",
        name: "テスト記録",
        description: "ブラウザ操作を記録してテストを生成します",
        source: "playwright",
      },
      {
        id: "view_report",
        name: "レポート表示",
        description: "テスト実行結果のレポートを表示します",
        source: "playwright",
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "GitHubリポジトリとの連携",
    icon: (
      <Image
        src="/logos/github.svg"
        alt="GitHub"
        width={24}
        height={24}
        className="h-6 w-6"
      />
    ),
    connected: true,
    apiDocsUrl: "https://docs.github.com/ja/rest",
    tools: [
      {
        id: "create_issue",
        name: "Issue作成",
        description: "新しいGitHub Issueを作成します",
        source: "github",
      },
      {
        id: "add_issue_comment",
        name: "Issueコメント追加",
        description: "既存のIssueにコメントを追加します",
        source: "github",
      },
      {
        id: "create_pull_request",
        name: "プルリクエスト作成",
        description: "新しいプルリクエストを作成します",
        source: "github",
      },
      {
        id: "merge_pull_request",
        name: "プルリクエストマージ",
        description: "プルリクエストをマージします",
        source: "github",
      },
    ],
  },
];
