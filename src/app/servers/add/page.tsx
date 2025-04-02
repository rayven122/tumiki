"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ServiceCard } from "../_components/ServiceCard";

type Service = {
	id: string;
	name: string;
	description: string;
	icon: string;
};

export default function AddServerPage() {
	// 利用可能なMCPサービスのサンプルデータ
	const [services] = useState<Service[]>([
		{
			id: "upstash",
			name: "Upstash",
			description:
				"高速なサーバーレスRedisとKafkaサービス。低レイテンシーと高スケーラビリティを提供します。",
			icon: "database",
		},
		{
			id: "vercel",
			name: "Vercel",
			description:
				"フロントエンドアプリケーションのためのグローバルデプロイメントプラットフォーム。",
			icon: "globe",
		},
		{
			id: "aws",
			name: "AWS",
			description:
				"包括的なクラウドコンピューティングサービス。EC2、S3、Lambdaなど多様なサービスを提供。",
			icon: "cloud",
		},
		{
			id: "gcp",
			name: "Google Cloud",
			description:
				"Googleのインフラストラクチャ上に構築されたクラウドサービス。機械学習やデータ分析に強み。",
			icon: "server",
		},
		{
			id: "azure",
			name: "Microsoft Azure",
			description:
				"マイクロソフトのクラウドコンピューティングサービス。企業向けの統合ソリューションを提供。",
			icon: "server-cog",
		},
		{
			id: "digitalocean",
			name: "DigitalOcean",
			description:
				"シンプルで使いやすいクラウドインフラストラクチャ。開発者向けの手頃な価格のサービス。",
			icon: "droplet",
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
