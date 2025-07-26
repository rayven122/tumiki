"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    deleteServerInstance({ id: instance.id });
  };

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
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteServer}
            disabled={isPending}
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
