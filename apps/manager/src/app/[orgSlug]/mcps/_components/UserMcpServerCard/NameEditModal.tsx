import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";

import { Button } from "@tumiki/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { type McpServerId } from "@/schema/ids";

type NameEditModalProps = {
  serverInstanceId: McpServerId;
  initialName: string;
  onSuccess?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
};

export const NameEditModal = ({
  initialName,
  serverInstanceId,
  onSuccess,
  onOpenChange,
}: NameEditModalProps) => {
  const [newName, setNewName] = useState(initialName);

  const { mutate: updateServerName, isPending } =
    api.userMcpServer.updateName.useMutation({
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
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>サーバー名を編集</DialogTitle>
          <DialogDescription>サーバーの表示名を変更します。</DialogDescription>
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
            <p className="text-muted-foreground text-xs">
              表示されるサーバー名を設定できます（空白や大文字を含むことができます）
            </p>
            <div className="bg-muted rounded-md px-3 py-2">
              <p className="text-muted-foreground text-xs font-medium">
                MCPサーバー識別子
              </p>
              <p className="font-mono text-sm">
                {normalizeServerName(newName)}
              </p>
            </div>
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
