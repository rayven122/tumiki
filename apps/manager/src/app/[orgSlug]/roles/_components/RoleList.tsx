"use client";

import { useState } from "react";
import { Shield, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { EditRoleDialog } from "./EditRoleDialog";
import { DeleteRoleDialog } from "./DeleteRoleDialog";
import type { ListRolesOutput } from "@/features/roles/api/list";

export const RoleList = () => {
  const [editingRole, setEditingRole] = useState<
    ListRolesOutput[number] | null
  >(null);
  const [deletingRole, setDeletingRole] = useState<
    ListRolesOutput[number] | null
  >(null);

  const { data: roles, isLoading } = api.role.list.useQuery({
    includePermissions: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground text-sm">読み込み中...</div>
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-sm">
          カスタムロールがまだありません。
        </p>
        <p className="text-muted-foreground text-sm">
          「ロール作成」ボタンから新しいロールを作成できます。
        </p>
      </div>
    );
  }

  // 権限情報を表示用にフォーマット
  const formatPermissions = (role: ListRolesOutput[number]) => {
    const parts: string[] = [];

    // デフォルト権限（全MCPサーバーに適用）- UI上は「アクセス/管理」で表示
    const defaultFlags: string[] = [];
    // アクセス権限 = read OR execute
    if (role.defaultRead || role.defaultExecute) defaultFlags.push("アクセス");
    // 管理権限 = write
    if (role.defaultWrite) defaultFlags.push("管理");
    if (defaultFlags.length > 0) {
      parts.push(`全サーバー: ${defaultFlags.join("/")}`);
    }

    // 特定サーバーへの追加権限
    const mcpPermissions = role.mcpPermissions ?? [];
    if (mcpPermissions.length > 0) {
      const overrideCount = mcpPermissions.length;
      parts.push(`+${overrideCount}サーバー追加`);
    }

    return parts.length > 0 ? parts.join(" / ") : null;
  };

  return (
    <>
      <div className="divide-y">
        {roles.map((role) => {
          const permissionText = formatPermissions(role);

          return (
            <div
              key={role.slug}
              className="flex items-center justify-between py-4"
            >
              {/* 左側: アイコン + ロール名 + slug */}
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <Shield className="text-primary h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{role.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Tag className="h-3 w-3" />
                    {role.slug}
                  </p>
                </div>
              </div>

              {/* 右側: 権限 + 作成日 + ボタン */}
              <div className="flex items-center gap-4">
                {permissionText && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {permissionText}
                  </Badge>
                )}
                <span className="text-muted-foreground text-sm">
                  作成日:{" "}
                  {new Date(role.createdAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingRole(role)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeletingRole(role)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
        />
      )}

      {deletingRole && (
        <DeleteRoleDialog
          role={deletingRole}
          open={!!deletingRole}
          onOpenChange={(open) => !open && setDeletingRole(null)}
        />
      )}
    </>
  );
};
