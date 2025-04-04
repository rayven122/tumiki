"use client";

import { PlusCircle } from "lucide-react";
import { ServerCard } from "./_components/ServerCard";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
// サーバーデータの型定義
type Server = {
	id: string;
	name: string;
	status: "running" | "stopped";
	lastUpdated: string;
	icon: string;
};

export default function ServersPage() {
	const [servers, setServers] = useState<Server[]>([
		{
			id: "1",
			name: "プロダクションサーバー",
			status: "running",
			lastUpdated: "2023-04-01T12:00:00Z",
			icon: "server",
		},
		{
			id: "2",
			name: "開発サーバー",
			status: "running",
			lastUpdated: "2023-04-01T10:30:00Z",
			icon: "server-cog",
		},
		{
			id: "3",
			name: "テストサーバー",
			status: "stopped",
			lastUpdated: "2023-03-31T15:45:00Z",
			icon: "server-off",
		},
		{
			id: "4",
			name: "バックアップサーバー",
			status: "running",
			lastUpdated: "2023-03-30T09:15:00Z",
			icon: "database",
		},
		{
			id: "5",
			name: "ステージングサーバー",
			status: "stopped",
			lastUpdated: "2023-03-29T14:20:00Z",
			icon: "server",
		},
		{
			id: "6",
			name: "ロードバランサー",
			status: "running",
			lastUpdated: "2023-03-28T11:10:00Z",
			icon: "network",
		},
	]);

	// サーバーの状態を変更する関数
	const handleStatusChange = (
		id: string,
		action: "start" | "stop" | "restart",
	) => {
		setServers(
			servers.map((server) => {
				if (server.id === id) {
					return {
						...server,
						status: action === "stop" ? "stopped" : "running",
						lastUpdated: new Date().toISOString(),
					};
				}
				return server;
			}),
		);
	};

	// サーバーを削除する関数
	const handleDelete = (id: string) => {
		setServers(servers.filter((server) => server.id !== id));
	};

	return (
		<div className="container mx-auto px-4 py-6">
			{/* ヘッダー */}
			<header className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">サーバー一覧</h1>
				<Link href="/servers/add">
					<Button className="flex items-center gap-2">
						<PlusCircle className="h-4 w-4" />
						新規サーバー追加
					</Button>
				</Link>
			</header>

			{/* メインコンテンツ - サーバー一覧 */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{servers.map((server) => (
					<ServerCard
						key={server.id}
						server={server}
						onStatusChange={handleStatusChange}
						onDelete={handleDelete}
					/>
				))}
			</div>
		</div>
	);
}
