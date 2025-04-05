"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ServiceCard } from "../_components/ServiceCard";

type Service = {
	id: string;
	name: string;
	description: string;
	icon: React.ReactNode;
};

export default function AddServerPage() {
	// 利用可能なMCPサービスのサンプルデータ
	const [services] = useState<Service[]>([
		{
			id: "slack",
			name: "Slack",
			description:
				"チームコミュニケーションツール。リアルタイムのメッセージング、ファイル共有、チャンネル管理が可能です。",
			icon: (
				<Image
					src="/logos/slack.svg"
					alt="Slack"
					width={24}
					height={24}
					className="h-6 w-6"
				/>
			),
		},
		{
			id: "notion",
			name: "Notion",
			description:
				"オールインワンワークスペース。ドキュメント管理、タスク管理、データベース機能を統合した生産性ツール。",
			icon: (
				<Image
					src="/logos/notion.svg"
					alt="Notion"
					width={24}
					height={24}
					className="h-6 w-6"
				/>
			),
		},
		{
			id: "playwright",
			name: "Playwright",
			description:
				"モダンなWebテスト自動化フレームワーク。クロスブラウザテスト、自動スクリーンショット、テストレポート生成が可能。",
			icon: (
				<Image
					src="/logos/playwright.svg"
					alt="Playwright"
					width={24}
					height={24}
					className="h-6 w-6"
				/>
			),
		},
		{
			id: "github",
			name: "GitHub",
			description:
				"バージョン管理とコラボレーションプラットフォーム。コード管理、Issueトラッキング、プルリクエスト機能を提供。",
			icon: (
				<Image
					src="/logos/github.svg"
					alt="GitHub"
					width={24}
					height={24}
					className="h-6 w-6"
				/>
			),
		},
	]);

	return (
		<div className="container mx-auto px-4 py-6">
			{/* ヘッダー */}
			<header className="mb-6 flex items-center">
				<Link href="/servers" className="mr-4">
					<Button variant="ghost" size="icon">
						<ChevronLeft className="h-5 w-5" />
					</Button>
				</Link>
				<h1 className="font-bold text-2xl">MCPサーバーの追加</h1>
			</header>

			{/* メインコンテンツ - サービス一覧 */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{services.map((service) => (
					<ServiceCard key={service.id} service={service} />
				))}
			</div>
		</div>
	);
}
