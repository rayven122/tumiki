import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function MCPServersPage() {
	return (
		<div className="container mx-auto py-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-3xl">サーバー管理</h1>
				<Link href="/servers/add">
					<Button>新規サーバー追加</Button>
				</Link>
			</div>

			<Tabs defaultValue="all" className="mb-8">
				<TabsList>
					<TabsTrigger value="all">すべて</TabsTrigger>
					<TabsTrigger value="connected">接続済み</TabsTrigger>
					<TabsTrigger value="disconnected">未接続</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{mcpServers.map((server) => (
					<ServerCard key={server.id} server={server} />
				))}
			</div>
		</div>
	);
}

function ServerCard({ server }: { server: MCPServer }) {
	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-3">
					{server.icon}
					<div>
						<CardTitle>{server.name}</CardTitle>
						<CardDescription>{server.description}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pb-2">
				<div className="mb-3 flex items-center gap-2">
					<Badge
						variant={server.connected ? "default" : "secondary"}
						className={server.connected ? "bg-green-100 text-green-800" : ""}
					>
						{server.connected ? "接続済み" : "未接続"}
					</Badge>
					<span className="text-muted-foreground text-sm">
						{server.connected ? `${server.tools.length}ツール利用可能` : ""}
					</span>
				</div>

				{server.connected && server.tools.length > 0 && (
					<ToolsDialog server={server} />
				)}
			</CardContent>
			<CardFooter className="flex justify-between pt-2">
				<Button variant="outline" size="sm" asChild>
					<Link href={`/servers/${server.id}`}>
						{server.connected ? "詳細" : "接続"}
					</Link>
				</Button>
				{server.apiDocsUrl && (
					<Link
						href={server.apiDocsUrl}
						target="_blank"
						className="flex items-center text-blue-600 text-sm hover:underline"
					>
						APIドキュメント
						<ArrowUpRight className="ml-1 h-3 w-3" />
					</Link>
				)}
			</CardFooter>
		</Card>
	);
}

function ToolsDialog({ server }: { server: MCPServer }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="w-full justify-start text-muted-foreground text-sm hover:text-foreground"
				>
					利用可能なツールを表示 ({server.tools.length})
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[500px]">
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
						<div key={tool.id} className="rounded-md border p-3">
							<div className="font-medium">{tool.name}</div>
							<div className="mt-1 text-muted-foreground text-sm">
								{tool.description}
							</div>
							<div className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs">
								ソースサーバー：{tool.source}
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

// 型定義
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
