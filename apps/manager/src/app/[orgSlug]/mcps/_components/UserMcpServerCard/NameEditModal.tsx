import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type McpServerId } from "@/schema/ids";

type NameEditModalProps = {
  serverInstanceId: McpServerId;
  initialName: string;
  initialDescription?: string;
  onSuccess?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
};

export const NameEditModal = ({
  initialName,
  initialDescription = "",
  serverInstanceId,
  onSuccess,
  onOpenChange,
}: NameEditModalProps) => {
  const [newName, setNewName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const { mutate: updateServerName, isPending } =
    api.v2.userMcpServer.updateName.useMutation({
      onSuccess: async () => {
        await onSuccess?.();
        toast.success("サーバー名を更新しました。");
      },
      onError: () => {
        toast.error(
          "サーバー名の更新に失敗しました。しばらく時間を置いてから再度お試しください。",
        );
      },
    });

  const onUpdate = () => {
    updateServerName({
      id: serverInstanceId,
      name: newName,
      description,
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>サーバー情報を編集</DialogTitle>
          <DialogDescription>
            サーバーの表示名と説明を変更します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">サーバー名</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="サーバー名を入力"
            />
            <p className="text-muted-foreground text-sm">
              英数字、ハイフン、アンダースコアのみ使用可能
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このMCPサーバーの説明を入力"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button onClick={onUpdate} disabled={isPending || !newName.trim()}>
            {isPending ? "更新中..." : "更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
