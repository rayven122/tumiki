"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PermissionMatrix } from "./PermissionMatrix";
import { type Permission } from "@/lib/permissions";

interface RoleCreateFormProps {
  organizationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const RoleCreateForm = ({
  organizationId,
  onSuccess,
  onCancel,
}: RoleCreateFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const createRoleMutation = api.organizationRole.create.useMutation({
    onSuccess: async (role) => {
      // Update permissions if any are selected
      if (permissions.length > 0) {
        await updatePermissionsMutation.mutateAsync({
          roleId: role.id,
          permissions,
        });
      }
      onSuccess();
    },
  });

  const updatePermissionsMutation =
    api.organizationRole.updatePermissions.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRoleMutation.mutateAsync({
      organizationId,
      name,
      description: description || undefined,
      isDefault,
    });
  };

  const isLoading =
    createRoleMutation.isPending || updatePermissionsMutation.isPending;

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
          {isLoading ? "作成中..." : "ロールを作成"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
};
