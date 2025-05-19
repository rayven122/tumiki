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

type NameEditModalProps = {
  initialName: string;
  userMcpServerId: string;
  onSuccess?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
};

export const NameEditModal = ({
  initialName,
  userMcpServerId,
  onSuccess,
  onOpenChange,
}: NameEditModalProps) => {
  const [newName, setNewName] = useState(initialName);

  const { mutate: updateUserMcpServer, isPending } =
    api.userMcpServer.update.useMutation({
      onSuccess: async () => {
        await onSuccess?.();
        toast.success("サーバー名を更新しました。");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const onUpdate = () => {
    updateUserMcpServer({ id: userMcpServerId, name: newName });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
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
