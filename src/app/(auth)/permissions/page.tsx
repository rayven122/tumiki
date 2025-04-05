import { PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PermissionsTable } from "./PermissionsTable";

export const metadata: Metadata = {
	title: "権限管理",
	description: "外部サービスツールの権限を一元管理します",
};

export default function PermissionsPage() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">権限管理</h1>
					<p className="text-muted-foreground">
						外部サービス（Slack、Notion、Playwright、GitHub等）のツール権限を一元管理します
					</p>
				</div>
				<Link href="/permissions/new">
					<Button className="gap-1">
						<PlusCircle className="h-4 w-4" />
						<span>新規権限作成</span>
					</Button>
				</Link>
			</div>
			<PermissionsTable />
		</div>
	);
}
