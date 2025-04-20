import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionForm } from "../PermissionForm";

export const metadata: Metadata = {
  title: "権限編集",
  description: "外部サービスツールの権限を編集します",
};

// Mock function to get permission data
function getPermission(id: string) {
  // In a real app, this would fetch from an API or database
  const permissions = [
    {
      id: "1",
      name: "Slack通知送信",
      description: "特定のSlackチャンネルにメッセージを送信する権限",
      toolType: "Slack",
      expirationDate: "2025-12-31",
      status: "active",
      scopes: ["chat:write", "channels:read"],
      targets: ["user1", "user2"],
    },
    {
      id: "2",
      name: "Notionページ編集",
      description: "特定のNotionワークスペース内のページを編集する権限",
      toolType: "Notion",
      expirationDate: "2025-06-30",
      status: "active",
      scopes: ["page:edit", "page:read"],
      targets: ["team1"],
    },
  ];

  const permission = permissions.find((p) => p.id === id);
  if (!permission) return null;

  return permission;
}

export default function EditPermissionPage({
  params,
}: {
  params: { id: string };
}) {
  const permission = params.id === "new" ? null : getPermission(params.id);

  // If trying to edit a non-existent permission, show 404
  if (params.id !== "new" && !permission) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {params.id === "new" ? "新規権限作成" : "権限編集"}
        </h1>
        <p className="text-muted-foreground">
          {params.id === "new"
            ? "新しい外部サービスツールの権限を作成します"
            : "既存の外部サービスツールの権限を編集します"}
        </p>
      </div>
      <PermissionForm initialData={permission} />
    </div>
  );
}
