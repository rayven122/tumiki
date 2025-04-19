import type { Metadata } from "next";
import { PermissionForm } from "../PermissionForm";

export const metadata: Metadata = {
	title: "新規権限作成",
	description: "新しい外部サービスツールの権限を作成します",
};

export default function NewPermissionPage() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">新規権限作成</h1>
				<p className="text-muted-foreground">
					新しい外部サービスツールの権限を作成します
				</p>
			</div>
			<PermissionForm />
		</div>
	);
}
