"use client";

import { useState } from "react";
import { Shield, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { EditRoleDialog } from "./EditRoleDialog";
import { DeleteRoleDialog } from "./DeleteRoleDialog";
import type { ListRolesOutput } from "@/server/api/routers/v2/role/list";

export const RoleList = () => {
  const [editingRole, setEditingRole] = useState<
    ListRolesOutput[number] | null
  >(null);
  const [deletingRole, setDeletingRole] = useState<
    ListRolesOutput[number] | null
  >(null);

  const { data: roles, isLoading } = api.v2.role.list.useQuery({
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

  const formatPermissions = (
    permissions: ListRolesOutput[number]["permissions"] | undefined,
  ) => {
    if (!permissions || permissions.length === 0) {
      return null;
    }

    const grouped = permissions.reduce(
      (acc, perm) => {
        const key = `${perm.resourceType}:${perm.resourceId || "全リソース"}`;
        acc[key] ??= {
          resourceType: perm.resourceType,
          resourceId: perm.resourceId,
          flags: [],
        };
        if (perm.read) acc[key].flags.push("R");
        if (perm.write) acc[key].flags.push("W");
        if (perm.execute) acc[key].flags.push("X");
        return acc;
      },
      {} as Record<
        string,
        { resourceType: string; resourceId: string; flags: string[] }
      >,
    );

    return Object.entries(grouped)
      .map(([, value]) => {
        const typeLabel =
          value.resourceType === "MCP_SERVER"
            ? "サーバー"
            : value.resourceType === "MCP_SERVER_CONFIG"
              ? "設定"
              : "テンプレート";
        const scope = value.resourceId ? "" : "(全)";
        return `${typeLabel}${scope}: ${value.flags.join("")}`;
      })
      .join(" / ");
  };

  return (
    <>
      <div className="divide-y">
        {roles.map((role) => {
          const permissionText = formatPermissions(role.permissions);

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
