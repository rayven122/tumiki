"use client";

import { useState } from "react";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tumiki/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { type Department } from "@/features/org-structure/utils/mock/mockOrgData";
import { IconPicker } from "./sidebar/IconPicker";

type CreateDepartmentDialogProps = {
  organizationId: string;
  departments: Department[];
};

export const CreateDepartmentDialog = ({
  organizationId,
  departments,
}: CreateDepartmentDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentGroupId, setParentGroupId] = useState<string | undefined>();
  const [icon, setIcon] = useState<string | undefined>();

  const utils = api.useUtils();

  const createMutation = api.group.create.useMutation({
    onSuccess: () => {
      setIsOpen(false);
      setName("");
      setParentGroupId(undefined);
      setIcon(undefined);
      void utils.group.list.invalidate();
      void utils.group.getMembers.invalidate();
      toast.success("部署を作成しました");
    },
    onError: (error) => {
      if (error.data?.code === "FORBIDDEN") {
        toast.error("部署を作成する権限がありません");
      } else if (error.data?.code === "NOT_FOUND") {
        toast.error("指定された親部署が見つかりません");
      } else {
        toast.error("部署の作成に失敗しました");
      }
    },
  });

  const handleSubmit = () => {
    if (name.trim()) {
      createMutation.mutate({
        organizationId,
        name: name.trim(),
        parentGroupId,
        icon,
      });
    }
  };

  // エンターキーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim() && !createMutation.isPending) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="h-3.5 w-3.5" />
          部署作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>部署を作成</DialogTitle>
          <DialogDescription>
            新しい部署を組織構造に追加します
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 部署名とアイコン */}
          <div>
            <Label htmlFor="department-name">部署名</Label>
            <div className="flex gap-2">
              <IconPicker selectedIcon={icon} onIconChange={setIcon} />
              <Input
                id="department-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例: 開発部、営業部"
                maxLength={100}
                className="flex-1"
              />
            </div>
            {name.length > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                {name.length}/100文字
              </p>
            )}
          </div>

          {/* 親部署選択 */}
          <div>
            <Label htmlFor="parent-group">親部署（オプション）</Label>
            <Select
              value={parentGroupId}
              onValueChange={(value) =>
                setParentGroupId(value === "none" ? undefined : value)
              }
            >
              <SelectTrigger id="parent-group">
                <SelectValue placeholder="親部署を選択しない（ルート直下）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  親部署を選択しない（ルート直下）
                </SelectItem>
                {departments
                  .filter((dept) => !dept.isRoot)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
