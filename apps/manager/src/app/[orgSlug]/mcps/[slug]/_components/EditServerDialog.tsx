"use client";

import { useState } from "react";
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
import { Textarea } from "@tumiki/ui/textarea";
import { api } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import { Loader2 } from "lucide-react";
import type { UserMcpServerDetail } from "./types";
import type { McpServerId } from "@/schema/ids";

type EditServerDialogProps = {
  server: UserMcpServerDetail;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

export const EditServerDialog = ({
  server,
  onClose,
  onSuccess,
}: EditServerDialogProps) => {
  const [serverName, setServerName] = useState(server.name);
  const [serverDescription, setServerDescription] = useState(
    server.description ?? "",
  );

  const { mutate: updateServer, isPending } =
    api.userMcpServer.updateName.useMutation({
      onSuccess: async () => {
        await onSuccess();
        onClose();
        toast.success("サーバー情報を更新しました");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const isDisabled = !serverName.trim() || isPending;

  const handleUpdateServer = () => {
    if (isDisabled) return;

    updateServer({
      id: server.id as McpServerId,
      name: serverName,
      description: serverDescription || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>サーバー情報を編集</DialogTitle>
          <DialogDescription>
            サーバーの名前と説明を編集します
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              placeholder="サーバー名を入力"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              placeholder="サーバーの説明を入力（任意）"
              value={serverDescription}
              onChange={(e) => setServerDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleUpdateServer} disabled={isDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              "更新"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
