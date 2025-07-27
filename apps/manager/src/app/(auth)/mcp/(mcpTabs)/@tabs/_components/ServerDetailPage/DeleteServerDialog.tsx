"use client";

import { useState } from "react";
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
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { Loader2, AlertTriangle } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { useRouter } from "next/navigation";

type ServerInstance = RouterOutputs["userMcpServerInstance"]["findById"];

type DeleteServerDialogProps = {
  instance: NonNullable<ServerInstance>;
  onClose: () => void;
};

export const DeleteServerDialog = ({
  instance,
  onClose,
}: DeleteServerDialogProps) => {
  const router = useRouter();
  const [confirmationName, setConfirmationName] = useState("");

  const { mutate: deleteServerInstance, isPending } =
    api.userMcpServerInstance.delete.useMutation({
      onSuccess: () => {
        toast.success("MCPサーバーを削除しました");
        router.push("/mcp");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleDeleteServer = () => {
    if (confirmationName !== instance.name) {
      toast.error("サーバー名が一致しません");
      return;
    }
    deleteServerInstance({ id: instance.id });
  };

  const isDeleteDisabled = isPending || confirmationName !== instance.name;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <DialogTitle>MCPサーバーを削除</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            この操作は取り消すことができません。MCPサーバー「
            <span className="font-medium">{instance.name}</span>
            」とそのすべての設定データが完全に削除されます。
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 rounded-md border border-red-200 bg-red-50 p-3">
          <div className="flex">
            <AlertTriangle className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="text-sm text-red-700">
              <p className="mb-1 font-medium">削除される内容:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>サーバー設定</li>
                <li>接続されているツール設定</li>
                <li>関連するログデータ</li>
                <li>APIキーとの関連付け</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="server-name" className="text-sm font-medium">
            確認のため、削除するサーバー名を入力してください
          </Label>
          <Input
            id="server-name"
            type="text"
            placeholder={instance.name}
            value={confirmationName}
            onChange={(e) => setConfirmationName(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            削除するには「<span className="font-medium">{instance.name}</span>
            」と入力してください
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteServer}
            disabled={isDeleteDisabled}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                削除中...
              </>
            ) : (
              "削除"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
