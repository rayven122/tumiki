"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
	ChevronLeft,
	Cloud,
	Database,
	Droplet,
	ExternalLink,
	Globe,
	Server,
	ServerCog,
} from "lucide-react";
import Link from "next/link";

// サービス情報の取得関数
const getServiceInfo = (serviceId: string) => {
	const services = {
		upstash: {
			name: "Upstash",
			icon: "database",
			tokenUrl: "https://upstash.com/account/api",
			tokenInstructions:
				"Upstashアカウントページで「Create API Key」をクリックし、新しいAPIキーを生成してください。",
		},
		vercel: {
			name: "Vercel",
			icon: "globe",
			tokenUrl: "https://vercel.com/account/tokens",
			tokenInstructions:
				"Vercelのアカウント設定から「Tokens」タブを開き、新しいトークンを作成してください。",
		},
		aws: {
			name: "AWS",
			icon: "cloud",
			tokenUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
			tokenInstructions:
				"AWSコンソールからIAMユーザーのアクセスキーを作成してください。",
		},
		gcp: {
			name: "Google Cloud",
			icon: "server",
			tokenUrl: "https://console.cloud.google.com/apis/credentials",
			tokenInstructions:
				"GCPコンソールから新しいサービスアカウントキーを作成してください。",
		},
		azure: {
			name: "Microsoft Azure",
			icon: "server-cog",
			tokenUrl:
				"https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
			tokenInstructions:
				"Azureポータルからアプリケーション登録を行い、クライアントシークレットを生成してください。",
		},
		digitalocean: {
			name: "DigitalOcean",
			icon: "droplet",
			tokenUrl: "https://cloud.digitalocean.com/account/api/tokens",
			tokenInstructions:
				"DigitalOceanコントロールパネルからAPIトークンを生成してください。",
		},
	};

	return (
		services[serviceId as keyof typeof services] || {
			name: "Unknown Service",
			icon: "server",
			tokenUrl: "#",
			tokenInstructions:
				"サービスプロバイダーのウェブサイトでAPIトークンを取得してください。",
		}
	);
};

// アイコンを選択する関数
const getIcon = (iconName: string) => {
	switch (iconName) {
		case "database":
			return <Database className="h-6 w-6" />;
		case "globe":
			return <Globe className="h-6 w-6" />;
		case "cloud":
			return <Cloud className="h-6 w-6" />;
		case "server":
			return <Server className="h-6 w-6" />;
		case "server-cog":
			return <ServerCog className="h-6 w-6" />;
		case "droplet":
			return <Droplet className="h-6 w-6" />;
		default:
			return <Server className="h-6 w-6" />;
	}
};

export default async function TokenPage({
	params,
}: { params: Promise<{ service: string }> }) {
	const serviceInfo = getServiceInfo((await params).service);

	return (
		<div className="container mx-auto px-4 py-6">
			{/* ヘッダー */}
			<header className="mb-6 flex items-center">
				<Link href="/servers/add" className="mr-4">
					<Button variant="ghost" size="icon">
						<ChevronLeft className="h-5 w-5" />
					</Button>
				</Link>
				<h1 className="font-bold text-2xl">APIトークンの設定</h1>
			</header>

			{/* サービス情報 */}
			<div className="mb-6 flex items-center">
				<div className="mr-3 rounded-md bg-muted p-3">
					{getIcon(serviceInfo.icon)}
				</div>
				<h2 className="font-semibold text-xl">{serviceInfo.name}</h2>
			</div>

			{/* APIトークン取得手順 */}
			<Card className="mb-6">
				<CardContent className="pt-6">
					<h3 className="mb-4 font-medium text-lg">APIトークンの取得方法</h3>

					<div className="space-y-4">
						<div className="flex">
							<div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
								1
							</div>
							<div>
								<p className="font-medium">APIトークン発行ページにアクセス</p>
								<a
									href={serviceInfo.tokenUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="mt-1 inline-flex items-center text-primary"
								>
									{serviceInfo.name}のAPIトークンページへ
									<ExternalLink className="ml-1 h-3 w-3" />
								</a>
							</div>
						</div>

						<div className="flex">
							<div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
								2
							</div>
							<div>
								<p className="font-medium">トークンの生成</p>
								<p className="mt-1 text-muted-foreground text-sm">
									{serviceInfo.tokenInstructions}
								</p>
							</div>
						</div>

						<div className="flex">
							<div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
								3
							</div>
							<div>
								<p className="font-medium">トークンの保存</p>
								<p className="mt-1 text-muted-foreground text-sm">
									生成されたトークンを下のフォームに入力し、「保存」ボタンをクリックしてください。
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* トークン入力フォーム */}
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="token">APIトークン</Label>
					<Input
						id="token"
						type="password"
						placeholder="APIトークンを入力してください"
						// value={token}
						// onChange={(e) => setToken(e.target.value)}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="expiry">有効期限（オプション）</Label>
					<Input
						id="expiry"
						type="date"
						// value={expiryDate}
						// onChange={(e) => setExpiryDate(e.target.value)}
					/>
					<p className="text-muted-foreground text-xs">
						トークンに有効期限がある場合は入力してください。
					</p>
				</div>

				<Separator className="my-4" />

				<Button onClick={() => {}} className="w-full">
					保存
				</Button>
			</div>
		</div>
	);
}
