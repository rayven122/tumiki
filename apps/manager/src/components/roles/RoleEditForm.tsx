"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PermissionMatrix } from "./PermissionMatrix";
import { type Permission, type RoleWithPermissions } from "@/lib/permissions";

interface RoleEditFormProps {
  role: RoleWithPermissions;
  onSuccess: () => void;
  onCancel: () => void;
}

export const RoleEditForm = ({
  role,
  onSuccess,
  onCancel,
}: RoleEditFormProps) => {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [isDefault, setIsDefault] = useState(role.isDefault);
  const [permissions, setPermissions] = useState<Permission[]>(
    role.permissions,
  );

  const updateRoleMutation = api.organizationRole.update.useMutation({
    onSuccess: async () => {
      // Update permissions
      await updatePermissionsMutation.mutateAsync({
        roleId: role.id,
        permissions,
      });
      onSuccess();
    },
  });

  const updatePermissionsMutation =
    api.organizationRole.updatePermissions.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateRoleMutation.mutateAsync({
      id: role.id,
      name,
      description: description || undefined,
      isDefault,
    });
  };

  const isLoading =
    updateRoleMutation.isPending || updatePermissionsMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">ロール名 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 編集者"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">説明</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="このロールの説明を入力してください"
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDefault"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked as boolean)}
          />
          <Label htmlFor="isDefault">デフォルトロールに設定</Label>
        </div>
      </div>

      <div>
        <Label>権限設定</Label>
        <PermissionMatrix
          selectedPermissions={permissions}
          onPermissionsChange={setPermissions}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!name.trim() || isLoading}>
          {isLoading ? "更新中..." : "ロールを更新"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
};
